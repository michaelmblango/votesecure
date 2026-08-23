# backend/routers/approvals.py
# ============================================================
# Admin approval system for sensitive actions
# Unanimous approval required from all org admins
# ============================================================

import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from database import get_connection
from config import settings
from routers.org_auth import get_current_org_admin
from services.email_service import send_approval_request_email, send_approval_result_email

router = APIRouter()


class InitiateApproval(BaseModel):
    action:        str
    action_label:  str
    action_payload: Optional[dict] = {}


class VoteRequest(BaseModel):
    vote: str  # "approved" | "rejected"


@router.post("/initiate")
def initiate_approval(data: InitiateApproval, current: dict = Depends(get_current_org_admin)):
    """
    Initiate a sensitive action that requires approval from all admins.
    """
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        org_id = current["org"]

        # Look up the initiator's real name - the JWT payload doesn't carry
        # full_name, so falling back to it would always show "An admin".
        cursor.execute(
            "SELECT full_name FROM org_admins WHERE org_admin_id = %s",
            (current["sub"],)
        )
        initiator = cursor.fetchone()
        initiator_name = initiator["full_name"] if initiator else "An admin"

        # Count total active admins in this org
        cursor.execute(
            "SELECT COUNT(*) AS cnt FROM org_admins WHERE org_id = %s AND is_active = TRUE",
            (org_id,)
        )
        total_admins = cursor.fetchone()["cnt"]

        # Create the approval request
        cursor.execute(
            """
            INSERT INTO admin_approval_requests
                (org_id, initiated_by, action, action_label,
                 action_payload, total_required)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING request_id, expires_at
            """,
            (
                org_id,
                current["sub"],
                data.action,
                data.action_label,
                json.dumps(data.action_payload or {}),
                total_admins,
            )
        )
        req = cursor.fetchone()
        request_id = str(req["request_id"])

        # Auto-approve for the initiating admin
        cursor.execute(
            """
            INSERT INTO admin_approval_votes (request_id, admin_id, vote)
            VALUES (%s, %s, 'approved')
            """,
            (request_id, current["sub"])
        )

        cursor.execute(
            "UPDATE admin_approval_requests SET total_approved = 1 WHERE request_id = %s",
            (request_id,)
        )

        # If the initiator is the only active admin, the request is already
        # fully approved - mark it resolved now rather than leaving it
        # permanently "pending" with no one left to vote.
        already_complete = total_admins <= 1
        if already_complete:
            cursor.execute(
                "UPDATE admin_approval_requests SET status = 'approved', executed_at = NOW() WHERE request_id = %s",
                (request_id,)
            )

        conn.commit()

        # Notify all other admins
        cursor.execute(
            """
            SELECT full_name, email FROM org_admins
            WHERE org_id = %s AND is_active = TRUE
              AND org_admin_id != %s
            """,
            (org_id, current["sub"])
        )
        other_admins = cursor.fetchall()

        cursor.execute(
            "SELECT org_name FROM organisations WHERE org_id = %s",
            (org_id,)
        )
        org = cursor.fetchone()

        approve_url = f"{settings.PLATFORM_URL}/org/approvals/{request_id}"

        if not already_complete:
            for admin in other_admins:
                send_approval_request_email(
                    email=admin["email"],
                    name=admin["full_name"],
                    org_name=org["org_name"],
                    action_label=data.action_label,
                    approve_url=approve_url,
                    initiated_by=initiator_name,
                    expires_hours=48,
                )

        return {
            "request_id":     request_id,
            "status":         "approved" if already_complete else "pending",
            "total_required": total_admins,
            "total_approved": 1,
            "message": (
                "You are the only active admin - action approved immediately."
                if already_complete
                else f"Approval request sent to {len(other_admins)} other admin(s)."
            ),
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close(); conn.close()


@router.post("/{request_id}/vote")
def vote_on_approval(
    request_id: str,
    data: VoteRequest,
    current: dict = Depends(get_current_org_admin),
):
    """
    Cast an approve or reject vote on a pending approval request.
    vote must be 'approved' or 'rejected'
    """
    vote = data.vote
    if vote not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Vote must be 'approved' or 'rejected'.")

    conn   = get_connection()
    cursor = conn.cursor()
    try:
        # Verify request exists and belongs to this org
        cursor.execute(
            """
            SELECT * FROM admin_approval_requests
            WHERE request_id = %s AND org_id = %s
            """,
            (request_id, current["org"])
        )
        req = cursor.fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Approval request not found.")
        if req["status"] != "pending":
            raise HTTPException(status_code=400, detail=f"This request is already {req['status']}.")
        if req["expires_at"] < datetime.utcnow():
            cursor.execute(
                "UPDATE admin_approval_requests SET status = 'expired' WHERE request_id = %s",
                (request_id,)
            )
            conn.commit()
            raise HTTPException(status_code=400, detail="This approval request has expired.")

        # Check if already voted
        cursor.execute(
            "SELECT vote_id FROM admin_approval_votes WHERE request_id = %s AND admin_id = %s",
            (request_id, current["sub"])
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="You have already voted on this request.")

        # Record the vote
        cursor.execute(
            "INSERT INTO admin_approval_votes (request_id, admin_id, vote) VALUES (%s, %s, %s)",
            (request_id, current["sub"], vote)
        )

        if vote == "rejected":
            # One rejection cancels the entire request
            cursor.execute(
                "UPDATE admin_approval_requests SET status = 'rejected' WHERE request_id = %s",
                (request_id,)
            )
            conn.commit()

            # Notify all admins of rejection
            cursor.execute(
                "SELECT full_name, email FROM org_admins WHERE org_id = %s AND is_active = TRUE",
                (current["org"],)
            )
            admins_to_notify = cursor.fetchall()
            cursor.execute(
                "SELECT org_name FROM organisations WHERE org_id = %s", (current["org"],)
            )
            org = cursor.fetchone()

            for admin in admins_to_notify:
                send_approval_result_email(
                    email=admin["email"],
                    name=admin["full_name"],
                    org_name=org["org_name"],
                    action_label=req["action_label"],
                    approved=False,
                )

            return {"status": "rejected", "message": "Action rejected. All admins have been notified."}

        else:
            # Increment approval count
            cursor.execute(
                """
                UPDATE admin_approval_requests
                SET total_approved = total_approved + 1
                WHERE request_id = %s
                RETURNING total_approved, total_required
                """,
                (request_id,)
            )
            updated = cursor.fetchone()
            conn.commit()

            if updated["total_approved"] >= updated["total_required"]:
                # All approved — execute the action
                cursor.execute(
                    "UPDATE admin_approval_requests SET status = 'approved', executed_at = NOW() WHERE request_id = %s",
                    (request_id,)
                )
                conn.commit()

                # Notify all admins the action was approved and executed
                cursor.execute(
                    "SELECT full_name, email FROM org_admins WHERE org_id = %s AND is_active = TRUE",
                    (current["org"],)
                )
                admins_to_notify = cursor.fetchall()
                cursor.execute(
                    "SELECT org_name FROM organisations WHERE org_id = %s", (current["org"],)
                )
                org = cursor.fetchone()

                for admin in admins_to_notify:
                    send_approval_result_email(
                        email=admin["email"],
                        name=admin["full_name"],
                        org_name=org["org_name"],
                        action_label=req["action_label"],
                        approved=True,
                    )

                return {
                    "status":  "approved",
                    "message": "All admins approved. Action has been executed.",
                    "execute": True,
                }

            remaining = updated["total_required"] - updated["total_approved"]
            return {
                "status":    "pending",
                "message":   f"Vote recorded. {remaining} more approval(s) needed.",
                "approved":  updated["total_approved"],
                "required":  updated["total_required"],
            }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close(); conn.close()


@router.get("/pending")
def get_pending_approvals(current: dict = Depends(get_current_org_admin)):
    """
    Get all pending approval requests for this organisation.
    """
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT
                r.*,
                a.full_name AS initiated_by_name,
                (
                    SELECT json_agg(json_build_object(
                        'admin_id',   v.admin_id,
                        'vote',       v.vote,
                        'voted_at',   v.voted_at,
                        'admin_name', adm.full_name
                    ))
                    FROM admin_approval_votes v
                    JOIN org_admins adm ON v.admin_id = adm.org_admin_id
                    WHERE v.request_id = r.request_id
                ) AS votes
            FROM admin_approval_requests r
            JOIN org_admins a ON r.initiated_by = a.org_admin_id
            WHERE r.org_id = %s
              AND r.status = 'pending'
              AND r.expires_at > NOW()
            ORDER BY r.created_at DESC
            """,
            (current["org"],)
        )
        requests = cursor.fetchall()

        # Check which ones current admin has voted on
        result = []
        for req in requests:
            d = dict(req)
            cursor.execute(
                "SELECT vote FROM admin_approval_votes WHERE request_id = %s AND admin_id = %s",
                (str(req["request_id"]), current["sub"])
            )
            my_vote = cursor.fetchone()
            d["my_vote"] = my_vote["vote"] if my_vote else None
            result.append(d)

        return {"pending_approvals": result}
    finally:
        cursor.close(); conn.close()
