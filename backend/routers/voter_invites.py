# backend/routers/voter_invites.py
# ============================================================
# Voter self-registration via invite links
#
# POST /api/voter-invites/send          — Admin sends invite to voter email
# POST /api/voter-invites/send-bulk     — Admin sends to multiple emails
# GET  /api/voter-invites/              — Admin lists all invites for their org
# GET  /api/voter-invites/register/{code} — Public: get invite details
# POST /api/voter-invites/register/{code} — Public: voter self-registers
# POST /api/voter-invites/{invite_id}/decide  — Admin approves/rejects a voter
# GET  /api/voter-invites/pending-approvals   — Admins see pending voters
# ============================================================

import secrets
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from database import get_connection
from config import settings
from routers.org_auth import get_current_org_admin
from services.auth_service import hash_password
from services.email_service import (
    send_voter_invite_email,
    send_voter_registration_confirmed,
    send_voter_approved_email,
    send_admin_voter_approval_needed,
)

router = APIRouter()


# ── Models ────────────────────────────────────────────────────
class SendInvite(BaseModel):
    email: EmailStr
    note:  Optional[str] = None

class BulkInvite(BaseModel):
    emails: List[EmailStr]
    note:   Optional[str] = None

class VoterSelfRegister(BaseModel):
    full_name:      str
    student_number: str
    password:       str
    department:     Optional[str] = None
    level:          Optional[str] = None

class ApprovalDecision(BaseModel):
    approved: bool
    reason:   Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────
def make_invite_code() -> str:
    return secrets.token_urlsafe(32)


# ════════════════════════════════════════════════════════════════
# SEND SINGLE INVITE
# ════════════════════════════════════════════════════════════════
@router.post("/send", status_code=201)
def send_invite(data: SendInvite, current: dict = Depends(get_current_org_admin)):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        org_id = current["org"]

        # Check not already invited
        cursor.execute(
            """
            SELECT invite_id, status FROM voter_invites
            WHERE org_id = %s AND email = %s
            ORDER BY created_at DESC LIMIT 1
            """,
            (org_id, data.email)
        )
        existing = cursor.fetchone()
        if existing and existing["status"] in ("pending", "registered", "approved"):
            raise HTTPException(
                status_code=409,
                detail=f"An invite for {data.email} already exists with status: {existing['status']}"
            )

        # Get org details
        cursor.execute(
            "SELECT org_name FROM organisations WHERE org_id = %s",
            (org_id,)
        )
        org = cursor.fetchone()

        # Get inviting admin name
        cursor.execute(
            "SELECT full_name FROM org_admins WHERE org_admin_id = %s",
            (current["sub"],)
        )
        admin = cursor.fetchone()

        # Count total admins for approvals_needed
        cursor.execute(
            "SELECT COUNT(*) AS cnt FROM org_admins WHERE org_id = %s AND is_active = TRUE",
            (org_id,)
        )
        total_admins   = cursor.fetchone()["cnt"]
        approvals_needed = max(2, total_admins - 1)

        # Create invite
        code = make_invite_code()
        cursor.execute(
            """
            INSERT INTO voter_invites
                (org_id, email, invite_code, invited_by,
                 approvals_needed, expires_at)
            VALUES (%s, %s, %s, %s, %s, NOW() + INTERVAL '7 days')
            RETURNING invite_id
            """,
            (org_id, data.email, code, current["sub"], approvals_needed)
        )
        invite_id = str(cursor.fetchone()["invite_id"])
        conn.commit()

        # Send invite email
        invite_url = f"{settings.PLATFORM_URL}/voter/register/{code}"
        send_voter_invite_email(
            email=data.email,
            org_name=org["org_name"],
            invite_url=invite_url,
            invited_by=admin["full_name"],
        )

        return {
            "invite_id":  invite_id,
            "email":      data.email,
            "invite_url": invite_url,
            "expires_in": "7 days",
            "message":    f"Invite sent to {data.email}",
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close(); conn.close()


# ════════════════════════════════════════════════════════════════
# SEND BULK INVITES
# ════════════════════════════════════════════════════════════════
@router.post("/send-bulk", status_code=201)
def send_bulk_invites(
    data: BulkInvite,
    current: dict = Depends(get_current_org_admin)
):
    if len(data.emails) > 100:
        raise HTTPException(
            status_code=400,
            detail="Maximum 100 emails per bulk invite."
        )

    conn   = get_connection()
    cursor = conn.cursor()
    results = []

    try:
        org_id = current["org"]

        cursor.execute(
            "SELECT org_name FROM organisations WHERE org_id = %s",
            (org_id,)
        )
        org = cursor.fetchone()

        cursor.execute(
            "SELECT full_name FROM org_admins WHERE org_admin_id = %s",
            (current["sub"],)
        )
        admin = cursor.fetchone()

        cursor.execute(
            """SELECT COUNT(*) AS cnt FROM org_admins
               WHERE org_id = %s AND is_active = TRUE""",
            (org_id,)
        )
        total_admins     = cursor.fetchone()["cnt"]
        approvals_needed = max(2, total_admins - 1)

        for email in data.emails:
            try:
                # Check not already invited
                cursor.execute(
                    """
                    SELECT invite_id, status FROM voter_invites
                    WHERE org_id = %s AND email = %s
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (org_id, email)
                )
                existing = cursor.fetchone()
                if existing and existing["status"] in (
                    "pending", "registered", "approved"
                ):
                    results.append({
                        "email":  email,
                        "status": "skipped",
                        "reason": f"Already invited ({existing['status']})"
                    })
                    continue

                code = make_invite_code()
                cursor.execute(
                    """
                    INSERT INTO voter_invites
                        (org_id, email, invite_code,
                         invited_by, approvals_needed,
                         expires_at)
                    VALUES (
                        %s, %s, %s, %s, %s,
                        NOW() + INTERVAL '7 days'
                    )
                    """,
                    (org_id, email, code,
                     current["sub"], approvals_needed)
                )
                conn.commit()

                invite_url = f"{settings.PLATFORM_URL}/voter/register/{code}"
                send_voter_invite_email(
                    email=email,
                    org_name=org["org_name"],
                    invite_url=invite_url,
                    invited_by=admin["full_name"],
                )
                results.append({"email": email, "status": "sent"})

            except Exception as e:
                conn.rollback()
                results.append({
                    "email":  email,
                    "status": "failed",
                    "reason": str(e)
                })

    finally:
        cursor.close()
        conn.close()

    sent    = sum(1 for r in results if r["status"] == "sent")
    skipped = sum(1 for r in results if r["status"] == "skipped")
    failed  = sum(1 for r in results if r["status"] == "failed")

    return {
        "sent":    sent,
        "skipped": skipped,
        "failed":  failed,
        "results": results,
    }


# ════════════════════════════════════════════════════════════════
# LIST ALL INVITES FOR ORG
# ════════════════════════════════════════════════════════════════
@router.get("/")
def list_invites(current: dict = Depends(get_current_org_admin)):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT
                vi.*,
                a.full_name AS invited_by_name,
                u.full_name AS voter_name,
                v.student_number
            FROM voter_invites vi
            LEFT JOIN org_admins a ON vi.invited_by    = a.org_admin_id
            LEFT JOIN voters     v ON vi.voter_id      = v.voter_id
            LEFT JOIN users      u ON v.user_id        = u.user_id
            WHERE vi.org_id = %s
            ORDER BY vi.created_at DESC
            """,
            (current["org"],)
        )
        invites = cursor.fetchall()
        return {"invites": [dict(i) for i in invites]}
    finally:
        cursor.close(); conn.close()


# ════════════════════════════════════════════════════════════════
# GET INVITE DETAILS (PUBLIC - no auth needed)
# ════════════════════════════════════════════════════════════════
@router.get("/register/{code}")
def get_invite_details(code: str):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT vi.invite_id, vi.email, vi.status, vi.expires_at,
                   o.org_name, o.org_id
            FROM voter_invites vi
            JOIN organisations o ON vi.org_id = o.org_id
            WHERE vi.invite_code = %s
            """,
            (code,)
        )
        invite = cursor.fetchone()
        if not invite:
            raise HTTPException(status_code=404, detail="Invite link not found or expired.")
        if invite["status"] == "approved":
            raise HTTPException(status_code=400, detail="This invite has already been used.")
        if invite["status"] == "expired":
            raise HTTPException(status_code=400, detail="This invite link has expired.")
        if invite["expires_at"] < datetime.utcnow():
            cursor.execute(
                "UPDATE voter_invites SET status = 'expired' WHERE invite_code = %s",
                (code,)
            )
            conn.commit()
            raise HTTPException(status_code=400, detail="This invite link has expired.")

        return {
            "email":    invite["email"],
            "org_name": invite["org_name"],
            "status":   invite["status"],
        }
    except HTTPException:
        raise
    finally:
        cursor.close(); conn.close()


# ════════════════════════════════════════════════════════════════
# VOTER SELF-REGISTERS (PUBLIC - no auth needed)
# ════════════════════════════════════════════════════════════════
@router.post("/register/{code}", status_code=201)
def voter_self_register(code: str, data: VoterSelfRegister):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        # Get and validate invite
        cursor.execute(
            """
            SELECT vi.*, o.org_name, o.org_id
            FROM voter_invites vi
            JOIN organisations o ON vi.org_id = o.org_id
            WHERE vi.invite_code = %s
            """,
            (code,)
        )
        invite = cursor.fetchone()
        if not invite:
            raise HTTPException(status_code=404, detail="Invite not found.")
        if invite["status"] not in ("pending",):
            raise HTTPException(status_code=400, detail=f"This invite is {invite['status']}.")
        if invite["expires_at"] < datetime.utcnow():
            raise HTTPException(status_code=400, detail="This invite link has expired.")

        # Check student number not already taken
        cursor.execute(
            "SELECT voter_id FROM voters WHERE student_number = %s",
            (data.student_number,)
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=409,
                detail="A voter with this student number already exists."
            )

        password_hash = hash_password(data.password)

        # Create user record - is_active FALSE until an admin approves.
        # This is the real gate: auth.py's login step rejects inactive
        # accounts before a JWT is ever issued, so an unapproved voter
        # can't reach votes.py at all. (eligibility_group alone does
        # NOT block voting - votes.py only checks it when the election
        # itself has eligible_group set, which is not the default.)
        cursor.execute(
            """
            INSERT INTO users (full_name, email, password_hash, role, is_active)
            VALUES (%s, %s, %s, 'voter', FALSE)
            ON CONFLICT (email) DO UPDATE
                SET full_name = EXCLUDED.full_name
            RETURNING user_id
            """,
            (data.full_name, invite["email"], password_hash)
        )
        user_id = str(cursor.fetchone()["user_id"])

        # Create voter record - voters has no is_active column.
        cursor.execute(
            """
            INSERT INTO voters
                (user_id, student_number, department,
                 level, eligibility_group)
            VALUES (%s, %s, %s, %s, 'pending')
            RETURNING voter_id
            """,
            (user_id, data.student_number, data.department, data.level)
        )
        voter_id = str(cursor.fetchone()["voter_id"])

        # Update invite status to registered
        cursor.execute(
            """
            UPDATE voter_invites
            SET status = 'registered', voter_id = %s
            WHERE invite_code = %s
            """,
            (voter_id, code)
        )
        conn.commit()

        # Send confirmation email to voter
        send_voter_registration_confirmed(
            email=invite["email"],
            name=data.full_name,
            org_name=invite["org_name"],
        )

        # Notify all admins that approval is needed
        cursor.execute(
            "SELECT full_name, email FROM org_admins WHERE org_id = %s AND is_active = TRUE",
            (str(invite["org_id"]),)
        )
        admins = cursor.fetchall()

        approval_url = f"{settings.PLATFORM_URL}/admin/voters"
        for admin in admins:
            send_admin_voter_approval_needed(
                admin_email=admin["email"],
                admin_name=admin["full_name"],
                voter_name=data.full_name,
                voter_email=invite["email"],
                org_name=invite["org_name"],
                approval_url=approval_url,
            )

        return {
            "message": "Registration successful. Your account is pending approval from the organisation administrators. You will receive an email when approved.",
            "status":  "pending_approval",
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close(); conn.close()


# ════════════════════════════════════════════════════════════════
# ADMIN APPROVES OR REJECTS A VOTER
# ════════════════════════════════════════════════════════════════
@router.post("/{invite_id}/decide")
def decide_voter(
    invite_id: str,
    data: ApprovalDecision,
    current: dict = Depends(get_current_org_admin),
):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        # Get invite
        cursor.execute(
            """
            SELECT vi.*, o.org_name, v.voter_id, v.user_id,
                   u.email, u.full_name AS voter_name
            FROM voter_invites vi
            JOIN organisations o ON vi.org_id    = o.org_id
            LEFT JOIN voters   v ON vi.voter_id  = v.voter_id
            LEFT JOIN users    u ON v.user_id    = u.user_id
            WHERE vi.invite_id = %s AND vi.org_id = %s
            """,
            (invite_id, current["org"])
        )
        invite = cursor.fetchone()
        if not invite:
            raise HTTPException(status_code=404, detail="Invite not found.")
        if invite["status"] != "registered":
            raise HTTPException(
                status_code=400,
                detail=f"This voter is not awaiting approval (status: {invite['status']})."
            )

        # Record this admin's approval
        cursor.execute(
            """
            INSERT INTO voter_invite_approvals
                (invite_id, admin_id, approved)
            VALUES (%s, %s, %s)
            ON CONFLICT (invite_id, admin_id) DO UPDATE
                SET approved = EXCLUDED.approved
            """,
            (invite_id, current["sub"], data.approved)
        )

        if not data.approved:
            # Rejected — mark invite, keep the account deactivated,
            # and label the voter row for visibility in admin UI.
            cursor.execute(
                "UPDATE voter_invites SET status = 'rejected' WHERE invite_id = %s",
                (invite_id,)
            )
            if invite["voter_id"]:
                cursor.execute(
                    """UPDATE voters SET eligibility_group = 'rejected'
                       WHERE voter_id = %s""",
                    (str(invite["voter_id"]),)
                )
            if invite["user_id"]:
                cursor.execute(
                    "UPDATE users SET is_active = FALSE WHERE user_id = %s",
                    (str(invite["user_id"]),)
                )
            conn.commit()
            return {"status": "rejected", "message": f"{invite['voter_name']} has been rejected."}

        # Check how many approvals we have now
        cursor.execute(
            "SELECT COUNT(*) AS cnt FROM voter_invite_approvals WHERE invite_id = %s AND approved = TRUE",
            (invite_id,)
        )
        approval_count = cursor.fetchone()["cnt"]

        if approval_count >= invite["approvals_needed"]:
            # Fully approved — activate voter's login (the real gate)
            # and clear the eligibility_group placeholder.
            cursor.execute(
                "UPDATE voter_invites SET status = 'approved', approvals_given = %s WHERE invite_id = %s",
                (approval_count, invite_id)
            )
            if invite["voter_id"]:
                cursor.execute(
                    """UPDATE voters SET eligibility_group = 'general'
                       WHERE voter_id = %s""",
                    (str(invite["voter_id"]),)
                )
            if invite["user_id"]:
                cursor.execute(
                    "UPDATE users SET is_active = TRUE WHERE user_id = %s",
                    (str(invite["user_id"]),)
                )
            conn.commit()

            # Email voter that they are approved
            if invite["email"] and invite["voter_name"]:
                send_voter_approved_email(
                    email=invite["email"],
                    name=invite["voter_name"],
                    org_name=invite["org_name"],
                    login_url=f"{settings.PLATFORM_URL}/login",
                )

            return {
                "status":  "approved",
                "message": f"{invite['voter_name']} is now approved and can vote.",
            }

        # Not enough approvals yet
        remaining = invite["approvals_needed"] - approval_count
        cursor.execute(
            "UPDATE voter_invites SET approvals_given = %s WHERE invite_id = %s",
            (approval_count, invite_id)
        )
        conn.commit()

        return {
            "status":    "pending",
            "approvals": approval_count,
            "needed":    invite["approvals_needed"],
            "message":   f"Approval recorded. {remaining} more needed.",
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close(); conn.close()


# ════════════════════════════════════════════════════════════════
# LIST PENDING VOTER APPROVALS
# ════════════════════════════════════════════════════════════════
@router.get("/pending-approvals")
def pending_approvals(current: dict = Depends(get_current_org_admin)):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT
                vi.invite_id,
                vi.email,
                vi.status,
                vi.approvals_needed,
                vi.approvals_given,
                vi.created_at,
                u.full_name  AS voter_name,
                v.student_number,
                v.department,
                v.level,
                (
                    SELECT json_agg(json_build_object(
                        'admin_name', a.full_name,
                        'approved',   via.approved,
                        'voted_at',   via.voted_at
                    ))
                    FROM voter_invite_approvals via
                    JOIN org_admins a ON via.admin_id = a.org_admin_id
                    WHERE via.invite_id = vi.invite_id
                ) AS approval_votes
            FROM voter_invites vi
            LEFT JOIN voters v ON vi.voter_id = v.voter_id
            LEFT JOIN users  u ON v.user_id   = u.user_id
            WHERE vi.org_id = %s
              AND vi.status = 'registered'
            ORDER BY vi.created_at ASC
            """,
            (current["org"],)
        )
        pending = cursor.fetchall()
        return {"pending": [dict(p) for p in pending]}
    finally:
        cursor.close(); conn.close()
