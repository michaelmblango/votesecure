# backend/routers/candidate_invites.py
# ============================================================
# Candidate self-registration via invite links
#
# POST /api/candidate-invites/send
#      Owner admin invites a candidate for a position
#
# GET  /api/candidate-invites/register/{code}
#      Public: get invite details (election, position, org)
#
# POST /api/candidate-invites/register/{code}
#      Public: candidate self-registers with profile
#
# GET  /api/candidate-invites/pending
#      All admins: see candidates pending approval
#
# POST /api/candidate-invites/{invite_id}/decide
#      All admins: approve or reject a candidate
#
# GET  /api/candidate-invites/election/{election_id}
#      All admins: list all candidate invites for election
# ============================================================

import secrets
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from typing import Optional
from database import get_connection
from config import settings
from routers.org_auth import get_current_org_admin, require_owner
from services.auth_service import hash_password
from services.email_service import (
    send_candidate_invite_email,
    send_candidate_registration_confirmed,
    send_candidate_approved_with_credentials,
    send_admin_candidate_approval_needed,
)

router = APIRouter()


def make_invite_code() -> str:
    return secrets.token_urlsafe(40)


# ── Models ────────────────────────────────────────────────────
class SendCandidateInvite(BaseModel):
    email:      str
    election_id: str
    position_id: str


class CandidateSelfRegister(BaseModel):
    username:   str
    password:   str
    full_name:  str
    photo_url:  Optional[str] = None
    party_name: Optional[str] = None
    manifesto:  Optional[str] = None

    @validator("username")
    def username_valid(cls, v):
        import re
        # Lower-cased for the same reason as voter registration:
        # login matching is case-insensitive, so the stored value
        # must be normalized or two users could register visually
        # identical usernames differing only in case.
        v = v.strip().lower()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if not re.match(r'^[a-zA-Z0-9._@+-]+$', v):
            raise ValueError(
                "Username can only contain letters, numbers, "
                "dots, underscores, @, + and hyphens"
            )
        return v

    @validator("password")
    def password_valid(cls, v):
        if len(v) < 8:
            raise ValueError(
                "Password must be at least 8 characters"
            )
        return v


class ApprovalDecision(BaseModel):
    approved: bool
    reason:   Optional[str] = None


# ════════════════════════════════════════════════════════════════
# SEND CANDIDATE INVITE — owner only
# ════════════════════════════════════════════════════════════════
@router.post("/send", status_code=201)
def send_candidate_invite(
    data: SendCandidateInvite,
    current: dict = Depends(require_owner),
):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        org_id = current["org"]

        # Validate election belongs to this org
        cursor.execute(
            """
            SELECT election_id, title, status, org_id
            FROM elections
            WHERE election_id = %s
            """,
            (data.election_id,)
        )
        election = cursor.fetchone()
        if not election:
            raise HTTPException(
                status_code=404, detail="Election not found."
            )
        if str(election["org_id"]) != org_id:
            raise HTTPException(
                status_code=403,
                detail="This election does not belong to your organisation."
            )
        if election["status"] not in ("draft",):
            raise HTTPException(
                status_code=400,
                detail="Candidates can only be invited to draft elections."
            )

        # Validate position belongs to election
        cursor.execute(
            """
            SELECT position_id, position_name
            FROM positions
            WHERE position_id = %s AND election_id = %s
            """,
            (data.position_id, data.election_id)
        )
        position = cursor.fetchone()
        if not position:
            raise HTTPException(
                status_code=404,
                detail="Position not found in this election."
            )

        # Check not already invited
        cursor.execute(
            """
            SELECT invite_id, status
            FROM candidate_invites
            WHERE email = %s AND position_id = %s
            ORDER BY created_at DESC LIMIT 1
            """,
            (data.email, data.position_id)
        )
        existing = cursor.fetchone()
        if existing and existing["status"] in (
            "pending", "registered", "approved"
        ):
            raise HTTPException(
                status_code=409,
                detail=f"This email was already invited for this position "
                       f"(status: {existing['status']})."
            )

        # Get org and inviting admin details
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

        # Create invite
        code = make_invite_code()
        cursor.execute(
            """
            INSERT INTO candidate_invites
                (election_id, position_id, org_id, email,
                 invite_code, invited_by)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING invite_id
            """,
            (
                data.election_id, data.position_id,
                org_id, data.email, code, current["sub"],
            )
        )
        invite_id = str(cursor.fetchone()["invite_id"])
        conn.commit()

        # Send invite email
        invite_url = (
            f"{settings.PLATFORM_URL}/candidate/register/{code}"
        )
        send_candidate_invite_email(
            email=data.email,
            org_name=org["org_name"],
            election_title=election["title"],
            position_name=position["position_name"],
            invite_url=invite_url,
            invited_by=admin["full_name"],
        )

        return {
            "invite_id":  invite_id,
            "email":      data.email,
            "invite_url": invite_url,
            "position":   position["position_name"],
            "election":   election["title"],
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
# GET INVITE DETAILS — public
# ════════════════════════════════════════════════════════════════
@router.get("/register/{code}")
def get_invite_details(code: str):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT
                ci.invite_id, ci.email, ci.status, ci.expires_at,
                o.org_name,
                e.title  AS election_title,
                p.position_name
            FROM candidate_invites ci
            JOIN organisations o ON ci.org_id      = o.org_id
            JOIN elections     e ON ci.election_id = e.election_id
            JOIN positions     p ON ci.position_id = p.position_id
            WHERE ci.invite_code = %s
            """,
            (code,)
        )
        invite = cursor.fetchone()
        if not invite:
            raise HTTPException(
                status_code=404,
                detail="Invite link not found or already used."
            )
        if invite["status"] in ("approved", "registered"):
            raise HTTPException(
                status_code=400,
                detail="This invite has already been used."
            )
        if invite["status"] == "rejected":
            raise HTTPException(
                status_code=400,
                detail="This invite has been rejected."
            )
        if invite["expires_at"] < datetime.utcnow():
            raise HTTPException(
                status_code=400,
                detail="This invite link has expired."
            )
        return {
            "email":          invite["email"],
            "org_name":       invite["org_name"],
            "election_title": invite["election_title"],
            "position_name":  invite["position_name"],
            "status":         invite["status"],
        }
    except HTTPException:
        raise
    finally:
        cursor.close(); conn.close()


# ════════════════════════════════════════════════════════════════
# CANDIDATE SELF-REGISTERS — public
# ════════════════════════════════════════════════════════════════
@router.post("/register/{code}", status_code=201)
def candidate_self_register(
    code: str, data: CandidateSelfRegister
):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        # Validate invite
        cursor.execute(
            """
            SELECT ci.*, o.org_name, o.org_id,
                   e.title AS election_title,
                   p.position_name
            FROM candidate_invites ci
            JOIN organisations o ON ci.org_id      = o.org_id
            JOIN elections     e ON ci.election_id = e.election_id
            JOIN positions     p ON ci.position_id = p.position_id
            WHERE ci.invite_code = %s
            """,
            (code,)
        )
        invite = cursor.fetchone()
        if not invite:
            raise HTTPException(
                status_code=404, detail="Invite not found."
            )
        if invite["status"] != "pending":
            raise HTTPException(
                status_code=400,
                detail=f"This invite has already been used "
                       f"(status: {invite['status']})."
            )
        if invite["expires_at"] < datetime.utcnow():
            raise HTTPException(
                status_code=400,
                detail="This invite link has expired."
            )

        # Check username not taken
        cursor.execute(
            "SELECT user_id FROM users WHERE username = %s",
            (data.username,)
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=409,
                detail="This username is already taken. "
                       "Please choose a different one."
            )

        password_hash = hash_password(data.password)

        # Create user record
        cursor.execute(
            """
            INSERT INTO users
                (full_name, email, password_hash,
                 role, username, is_active)
            VALUES (%s, %s, %s, 'candidate', %s, FALSE)
            ON CONFLICT (email) DO UPDATE
                SET full_name     = EXCLUDED.full_name,
                    username      = EXCLUDED.username,
                    password_hash = EXCLUDED.password_hash,
                    role          = 'candidate'
            RETURNING user_id
            """,
            (
                data.full_name, invite["email"],
                password_hash, data.username,
            )
        )
        user_id = str(cursor.fetchone()["user_id"])

        # Create candidate record with pending status
        # Use manifesto field for combined profile info
        manifesto_text = data.manifesto or ""
        if data.party_name:
            manifesto_text = (
                f"Party/Team: {data.party_name}\n\n"
                + manifesto_text
            )

        cursor.execute(
            """
            INSERT INTO candidates
                (position_id, display_name, manifesto,
                 photo_url, approval_status, display_order)
            VALUES (%s, %s, %s, %s, 'pending', 0)
            RETURNING candidate_id
            """,
            (
                str(invite["position_id"]),
                data.full_name,
                manifesto_text or None,
                data.photo_url,
            )
        )
        candidate_id = str(cursor.fetchone()["candidate_id"])

        # Update invite
        cursor.execute(
            """
            UPDATE candidate_invites
            SET status       = 'registered',
                candidate_id = %s
            WHERE invite_code = %s
            """,
            (candidate_id, code)
        )
        conn.commit()

        # Send confirmation to candidate
        send_candidate_registration_confirmed(
            email=invite["email"],
            name=data.full_name,
            org_name=invite["org_name"],
            election_title=invite["election_title"],
            position_name=invite["position_name"],
        )

        # Notify all admins
        cursor.execute(
            """
            SELECT full_name, email
            FROM org_admins
            WHERE org_id = %s AND is_active = TRUE
            """,
            (str(invite["org_id"]),)
        )
        admins = cursor.fetchall()

        approval_url = (
            f"{settings.PLATFORM_URL}/admin/elections/"
            f"{str(invite['election_id'])}"
        )
        for admin in admins:
            send_admin_candidate_approval_needed(
                admin_email=admin["email"],
                admin_name=admin["full_name"],
                candidate_name=data.full_name,
                candidate_email=invite["email"],
                org_name=invite["org_name"],
                position_name=invite["position_name"],
                election_title=invite["election_title"],
                approval_url=approval_url,
            )

        return {
            "message": (
                "Registration complete. Your candidacy is pending "
                "approval from the administrators. You will receive "
                "an email with your credentials once approved."
            ),
            "status":       "pending_approval",
            "candidate_id": candidate_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close(); conn.close()


# ════════════════════════════════════════════════════════════════
# APPROVE OR REJECT CANDIDATE — all admins
# ════════════════════════════════════════════════════════════════
@router.post("/{invite_id}/decide")
def decide_candidate(
    invite_id: str,
    data: ApprovalDecision,
    current: dict = Depends(get_current_org_admin),
):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT ci.*, o.org_name,
                   e.title AS election_title,
                   p.position_name,
                   c.display_name AS candidate_name,
                   u.email AS candidate_email,
                   u.username
            FROM candidate_invites ci
            JOIN organisations o ON ci.org_id      = o.org_id
            JOIN elections     e ON ci.election_id = e.election_id
            JOIN positions     p ON ci.position_id = p.position_id
            LEFT JOIN candidates c ON ci.candidate_id = c.candidate_id
            LEFT JOIN users u ON u.email = ci.email
            WHERE ci.invite_id = %s
              AND ci.org_id    = %s
            """,
            (invite_id, current["org"])
        )
        invite = cursor.fetchone()
        if not invite:
            raise HTTPException(
                status_code=404,
                detail="Candidate invite not found."
            )
        if invite["status"] != "registered":
            raise HTTPException(
                status_code=400,
                detail=f"This candidate is not awaiting approval "
                       f"(status: {invite['status']})."
            )

        if not data.approved:
            # Rejected
            cursor.execute(
                "UPDATE candidate_invites SET status = 'rejected' WHERE invite_id = %s",
                (invite_id,)
            )
            if invite["candidate_id"]:
                cursor.execute(
                    "UPDATE candidates SET approval_status = 'rejected' WHERE candidate_id = %s",
                    (str(invite["candidate_id"]),)
                )
            conn.commit()
            return {
                "status":  "rejected",
                "message": f"{invite['candidate_name']} has been rejected.",
            }

        # Approved — activate candidate
        cursor.execute(
            "UPDATE candidate_invites SET status = 'approved' WHERE invite_id = %s",
            (invite_id,)
        )
        if invite["candidate_id"]:
            cursor.execute(
                "UPDATE candidates SET approval_status = 'approved' WHERE candidate_id = %s",
                (str(invite["candidate_id"]),)
            )

        # Activate the candidate's user account
        cursor.execute(
            "UPDATE users SET is_active = TRUE WHERE email = %s",
            (invite["email"],)
        )
        conn.commit()

        # Send approval email with credentials
        if invite["candidate_email"] and invite["candidate_name"]:
            send_candidate_approved_with_credentials(
                email=invite["candidate_email"],
                name=invite["candidate_name"],
                username=invite["username"] or invite["candidate_email"],
                org_name=invite["org_name"],
                election_title=invite["election_title"],
                position_name=invite["position_name"],
                login_url=f"{settings.PLATFORM_URL}/login",
            )

        return {
            "status":  "approved",
            "message": (
                f"{invite['candidate_name']} is approved and "
                f"will appear on the ballot."
            ),
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close(); conn.close()


# ════════════════════════════════════════════════════════════════
# LIST PENDING CANDIDATE APPROVALS — all admins
# ════════════════════════════════════════════════════════════════
@router.get("/pending")
def pending_candidate_approvals(
    current: dict = Depends(get_current_org_admin),
):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT
                ci.invite_id, ci.email, ci.status,
                ci.created_at,
                e.title        AS election_title,
                e.election_id,
                p.position_name,
                c.display_name AS candidate_name,
                c.manifesto,
                c.photo_url,
                c.candidate_id
            FROM candidate_invites ci
            JOIN elections   e ON ci.election_id  = e.election_id
            JOIN positions   p ON ci.position_id  = p.position_id
            LEFT JOIN candidates c ON ci.candidate_id = c.candidate_id
            WHERE ci.org_id = %s
              AND ci.status = 'registered'
            ORDER BY ci.created_at ASC
            """,
            (current["org"],)
        )
        pending = cursor.fetchall()
        return {"pending": [dict(p) for p in pending]}
    finally:
        cursor.close(); conn.close()


# ════════════════════════════════════════════════════════════════
# LIST ALL INVITES FOR AN ELECTION — all admins
# ════════════════════════════════════════════════════════════════
@router.get("/election/{election_id}")
def list_election_invites(
    election_id: str,
    current: dict = Depends(get_current_org_admin),
):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT
                ci.invite_id, ci.email, ci.status,
                ci.created_at, ci.expires_at,
                p.position_name,
                c.display_name AS candidate_name,
                c.approval_status,
                c.candidate_id
            FROM candidate_invites ci
            JOIN positions   p ON ci.position_id  = p.position_id
            LEFT JOIN candidates c ON ci.candidate_id = c.candidate_id
            WHERE ci.election_id = %s
              AND ci.org_id      = %s
            ORDER BY p.position_name, ci.created_at
            """,
            (election_id, current["org"])
        )
        invites = cursor.fetchall()
        return {"invites": [dict(i) for i in invites]}
    finally:
        cursor.close(); conn.close()
