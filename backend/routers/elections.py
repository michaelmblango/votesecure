# backend/routers/elections.py
# ============================================================
# Election management endpoints - admin only
#
# Elections
# GET    /api/elections                 - List all elections
# GET    /api/elections/{id}            - Get one election (full detail)
# POST   /api/elections                 - Create election (admin)
# PATCH  /api/elections/{id}/status     - Open/close election (admin)
# DELETE /api/elections/{id}            - Archive election (admin)
#
# Positions
# POST   /api/elections/{id}/positions          - Add position
# DELETE /api/elections/{id}/positions/{pos_id} - Remove position
#
# Candidates
# POST   /api/elections/{id}/positions/{pos_id}/candidates
#        - Register candidate for a position
# PATCH  /api/elections/{id}/candidates/{cand_id}/status
#        - Approve or reject a candidate
# GET    /api/elections/{id}/candidates
#        - List all candidates in an election
# ============================================================

import threading
from fastapi import APIRouter, HTTPException, status, Depends
from database import get_connection
from models.election import (
    ElectionCreate, ElectionUpdate, ElectionStatusUpdate,
    PositionCreate, CandidateCreate, CandidateStatusUpdate,
)
from dependencies import get_current_user, require_admin
from config import settings
from services.email_service import send_election_open_notification
from routers.org_auth import require_owner

router = APIRouter()


# ════════════════════════════════════════════════════════════
# HELPER - fetch election or raise 404
# ════════════════════════════════════════════════════════════
def get_election_or_404(cursor, election_id: str) -> dict:
    cursor.execute(
        "SELECT * FROM elections WHERE election_id = %s",
        (election_id,)
    )
    election = cursor.fetchone()
    if not election:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Election not found.",
        )
    return dict(election)


# ════════════════════════════════════════════════════════════
# LIST ELECTIONS
# Voters see only active elections they are eligible for.
# Admins see all elections regardless of status.
# ════════════════════════════════════════════════════════════
@router.get("")
def list_elections(current_user: dict = Depends(get_current_user)):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        role = current_user.get("role", "voter")

        if role in ("system_admin", "election_admin", "auditor"):
            # Admins see every election IN THEIR OWN ORG. org_id is
            # only absent on a legacy non-org admin token (none are
            # issued by the live app) - fall back to unscoped in
            # that case rather than showing nothing.
            org_id = current_user.get("org")
            cursor.execute(
                """
                SELECT e.*,
                       u.full_name AS created_by_name,
                       COUNT(DISTINCT p.position_id) AS total_positions,
                       COUNT(DISTINCT v.vote_id)     AS total_votes_cast
                FROM elections e
                LEFT JOIN users     u ON e.created_by    = u.user_id
                LEFT JOIN positions p ON e.election_id   = p.election_id
                LEFT JOIN votes     v ON e.election_id   = v.election_id
                WHERE (%s::uuid IS NULL OR e.org_id = %s)
                GROUP BY e.election_id, u.full_name
                ORDER BY e.created_at DESC
                """,
                (org_id, org_id)
            )
        else:
            # Voters see only active elections
            cursor.execute(
                """
                SELECT e.*,
                       COUNT(DISTINCT p.position_id) AS total_positions
                FROM elections e
                LEFT JOIN positions p ON e.election_id = p.election_id
                WHERE e.status = 'active'
                GROUP BY e.election_id
                ORDER BY e.start_time ASC
                """
            )

        elections = cursor.fetchall()
        return {"elections": [dict(e) for e in elections]}

    finally:
        cursor.close()
        conn.close()


# ════════════════════════════════════════════════════════════
# GET ONE ELECTION - full detail with positions and candidates
# ════════════════════════════════════════════════════════════
@router.get("/{election_id}")
def get_election(
    election_id: str,
    current_user: dict = Depends(get_current_user),
):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        election = get_election_or_404(cursor, election_id)

        # Fetch positions for this election
        cursor.execute(
            """
            SELECT * FROM positions
            WHERE election_id = %s
            ORDER BY display_order ASC
            """,
            (election_id,)
        )
        positions = cursor.fetchall()

        # Fetch approved candidates for each position
        result_positions = []
        for pos in positions:
            pos_id = str(pos["position_id"])
            cursor.execute(
                """
                SELECT c.*,
                       COUNT(v.vote_id) AS vote_count
                FROM candidates c
                LEFT JOIN votes v ON c.candidate_id = v.candidate_id
                WHERE c.position_id = %s
                  AND c.approval_status = 'approved'
                GROUP BY c.candidate_id
                ORDER BY c.display_order ASC
                """,
                (pos_id,)
            )
            candidates = cursor.fetchall()
            pos_dict = dict(pos)
            pos_dict["candidates"] = [dict(c) for c in candidates]
            result_positions.append(pos_dict)

        election["positions"] = result_positions
        return election

    finally:
        cursor.close()
        conn.close()


# ════════════════════════════════════════════════════════════
# CREATE ELECTION - admin only
# ════════════════════════════════════════════════════════════
@router.post("", status_code=status.HTTP_201_CREATED)
def create_election(
    data: ElectionCreate,
    current_user: dict = Depends(require_owner),
):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO elections
                (title, description, election_type, start_time, end_time,
                 eligible_group, is_public_results, created_by, status,
                 max_voters, plan_name, licence_id, org_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'draft', %s, %s, %s, %s)
            RETURNING *
            """,
            (
                data.title,
                data.description,
                data.election_type,
                data.start_time,
                data.end_time,
                data.eligible_group,
                data.is_public_results,
                current_user.get("user_id") or current_user["sub"],
                data.max_voters or 10,
                data.plan_name  or "free",
                data.licence_id,
                current_user["org"],
            )
        )
        new_election = cursor.fetchone()

        # ── Free tier voter limit enforcement ──────────────────
        # voters/users have no org_id column - voter_invites.org_id
        # is used as the scoping proxy (an invite is created per org
        # and linked to the resulting voter_id once approved).
        if not data.licence_id:
            org_id = current_user.get("org")
            if org_id:
                cursor.execute(
                    """
                    SELECT COUNT(DISTINCT vi.voter_id) AS cnt
                    FROM voter_invites vi
                    WHERE vi.org_id = %s
                      AND vi.status = 'approved'
                      AND vi.voter_id IS NOT NULL
                    """,
                    (org_id,)
                )
                voter_count = cursor.fetchone()["cnt"]
                FREE_LIMIT  = 10
                if voter_count > FREE_LIMIT:
                    raise HTTPException(
                        status_code=403,
                        detail=(
                            f"Your organisation has {voter_count} approved "
                            f"voters but the free plan supports up to "
                            f"{FREE_LIMIT}. Purchase a licence to run "
                            f"this election."
                        )
                    )

        # Mark licence as used if provided
        if data.licence_id:
            election_id = str(new_election["election_id"])
            cursor.execute(
                """
                UPDATE election_licences
                SET status   = 'used',
                    used_by  = %s,
                    used_at  = NOW(),
                    election_id = %s
                WHERE licence_id = %s
                """,
                (current_user["sub"], election_id, data.licence_id)
            )

        # Log it
        cursor.execute(
            """
            INSERT INTO audit_logs
                (actor_id, actor_type, event_type, event_description)
            VALUES (%s, 'admin', 'ELECTION_CREATED', %s)
            """,
            (current_user["sub"], f"Election created: {data.title}")
        )
        conn.commit()

        return {
            "message":  "Election created successfully.",
            "election": dict(new_election),
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create election: {str(e)}")
    finally:
        cursor.close()
        conn.close()


# ════════════════════════════════════════════════════════════
# UPDATE ELECTION STATUS - open, close, archive
# Lifecycle: draft → active → closed → archived
# ════════════════════════════════════════════════════════════
@router.patch("/{election_id}/status")
def update_election_status(
    election_id: str,
    data: ElectionStatusUpdate,
    current_user: dict = Depends(require_owner),
):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        election = get_election_or_404(cursor, election_id)
        old_status = election["status"]

        # Enforce valid transitions
        valid_transitions = {
            "draft":    ["active"],
            "active":   ["closed"],
            "closed":   ["archived"],
            "archived": [],
        }
        if data.status not in valid_transitions.get(old_status, []):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cannot move election from '{old_status}' to '{data.status}'. "
                    f"Valid next status: {valid_transitions[old_status]}"
                ),
            )

        cursor.execute(
            """
            UPDATE elections
            SET status = %s, updated_at = NOW()
            WHERE election_id = %s
            RETURNING *
            """,
            (data.status, election_id)
        )
        updated = cursor.fetchone()

        # Map status to readable event name
        event_map = {
            "active":   "ELECTION_OPENED",
            "closed":   "ELECTION_CLOSED",
            "archived": "ELECTION_ARCHIVED",
        }
        cursor.execute(
            """
            INSERT INTO audit_logs
                (actor_id, actor_type, event_type, event_description)
            VALUES (%s, 'admin', %s, %s)
            """,
            (
                current_user["sub"],
                event_map.get(data.status, "ELECTION_UPDATED"),
                f"Election '{election['title']}' status → {data.status}",
            )
        )
        conn.commit()

        # Notify eligible voters once the election opens.
        # Sent from a background thread so the status-update response
        # doesn't block on a loop of blocking SMTP calls.
        if data.status == "active":
            try:
                cursor.execute(
                    """
                    SELECT u.email, u.full_name
                    FROM voters v
                    JOIN users u ON v.user_id = u.user_id
                    WHERE u.is_active = TRUE
                      AND (%s IS NULL OR v.eligibility_group = %s)
                    """,
                    (election["eligible_group"], election["eligible_group"])
                )
                eligible_voters = cursor.fetchall()

                end_time_str = None
                if election["end_time"]:
                    end_time_str = election["end_time"].strftime("%d %B %Y at %H:%M")

                ballot_url = f"{settings.PLATFORM_URL}/ballot"
                # No org linkage exists on elections - see the same
                # note in analytics.py's public results endpoint.
                org_name = "VoteSecure"

                def send_notifications(voters, title, org, end_t, url):
                    sent = 0
                    for voter in voters:
                        try:
                            send_election_open_notification(
                                email=voter["email"],
                                name=voter["full_name"],
                                election_title=title,
                                org_name=org,
                                end_time=end_t,
                                ballot_url=url,
                            )
                            sent += 1
                        except Exception:
                            pass
                    print(f"Election open: notified {sent}/{len(voters)} voters")

                threading.Thread(
                    target=send_notifications,
                    args=(eligible_voters, election["title"], org_name, end_time_str, ballot_url),
                    daemon=True,
                ).start()

                print(f"Election opened: sending notifications to {len(eligible_voters)} voters in background")
            except Exception as notify_err:
                # Never let notification failure block the status update
                print(f"Voter notification error: {notify_err}")

        return {
            "message":  f"Election status updated to '{data.status}'.",
            "election": dict(updated),
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ════════════════════════════════════════════════════════════
# ADD POSITION TO ELECTION
# ════════════════════════════════════════════════════════════
@router.post("/{election_id}/positions", status_code=status.HTTP_201_CREATED)
def add_position(
    election_id: str,
    data: PositionCreate,
    current_user: dict = Depends(require_owner),
):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        election = get_election_or_404(cursor, election_id)

        # Can only add positions while election is in draft
        if election["status"] != "draft":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Positions can only be added while the election is in draft status.",
            )

        cursor.execute(
            """
            INSERT INTO positions
                (election_id, position_name, description,
                 max_votes, display_order)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                election_id,
                data.position_name,
                data.description,
                data.max_votes,
                data.display_order,
            )
        )
        new_position = cursor.fetchone()

        cursor.execute(
            """
            INSERT INTO audit_logs
                (actor_id, actor_type, event_type, event_description)
            VALUES (%s, 'admin', 'POSITION_ADDED', %s)
            """,
            (
                current_user["sub"],
                f"Position '{data.position_name}' added to '{election['title']}'",
            )
        )
        conn.commit()

        return {
            "message":  "Position added successfully.",
            "position": dict(new_position),
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ════════════════════════════════════════════════════════════
# DELETE POSITION
# ════════════════════════════════════════════════════════════
@router.delete("/{election_id}/positions/{position_id}")
def delete_position(
    election_id: str,
    position_id: str,
    current_user: dict = Depends(require_owner),
):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        election = get_election_or_404(cursor, election_id)

        if election["status"] != "draft":
            raise HTTPException(
                status_code=400,
                detail="Positions can only be removed from draft elections.",
            )

        cursor.execute(
            "DELETE FROM positions WHERE position_id = %s AND election_id = %s RETURNING position_name",
            (position_id, election_id)
        )
        deleted = cursor.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Position not found.")

        conn.commit()
        return {"message": f"Position '{deleted['position_name']}' removed."}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ════════════════════════════════════════════════════════════
# REGISTER CANDIDATE FOR A POSITION
# ════════════════════════════════════════════════════════════
@router.post(
    "/{election_id}/positions/{position_id}/candidates",
    status_code=status.HTTP_201_CREATED,
)
def add_candidate(
    election_id: str,
    position_id: str,
    data: CandidateCreate,
    current_user: dict = Depends(require_owner),
):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        # Verify position belongs to this election
        cursor.execute(
            "SELECT * FROM positions WHERE position_id = %s AND election_id = %s",
            (position_id, election_id)
        )
        position = cursor.fetchone()
        if not position:
            raise HTTPException(status_code=404, detail="Position not found in this election.")

        cursor.execute(
            """
            INSERT INTO candidates
                (position_id, display_name, manifesto,
                 photo_url, display_order, approval_status)
            VALUES (%s, %s, %s, %s, %s, 'pending')
            RETURNING *
            """,
            (
                position_id,
                data.display_name,
                data.manifesto,
                data.photo_url,
                data.display_order,
            )
        )
        new_candidate = cursor.fetchone()

        cursor.execute(
            """
            INSERT INTO audit_logs
                (actor_id, actor_type, event_type, event_description)
            VALUES (%s, 'admin', 'CANDIDATE_REGISTERED', %s)
            """,
            (
                current_user["sub"],
                f"Candidate '{data.display_name}' registered for '{position['position_name']}'",
            )
        )
        conn.commit()

        return {
            "message":   "Candidate registered. Pending approval.",
            "candidate": dict(new_candidate),
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ════════════════════════════════════════════════════════════
# APPROVE OR REJECT A CANDIDATE
# ════════════════════════════════════════════════════════════
@router.patch("/{election_id}/candidates/{candidate_id}/status")
def update_candidate_status(
    election_id: str,
    candidate_id: str,
    data: CandidateStatusUpdate,
    current_user: dict = Depends(require_admin),
):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE candidates
            SET approval_status = %s,
                approved_by     = %s,
                approved_at     = NOW()
            WHERE candidate_id = %s
            RETURNING *
            """,
            (
                data.approval_status,
                current_user.get("user_id") or current_user["sub"],
                candidate_id,
            )
        )
        updated = cursor.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Candidate not found.")

        cursor.execute(
            """
            INSERT INTO audit_logs
                (actor_id, actor_type, event_type, event_description)
            VALUES (%s, 'admin', 'CANDIDATE_STATUS_UPDATED', %s)
            """,
            (
                current_user["sub"],
                f"Candidate '{updated['display_name']}' → {data.approval_status}",
            )
        )
        conn.commit()

        return {
            "message":   f"Candidate {data.approval_status}.",
            "candidate": dict(updated),
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ════════════════════════════════════════════════════════════
# LIST ALL CANDIDATES IN AN ELECTION (admin view - all statuses)
# ════════════════════════════════════════════════════════════
@router.get("/{election_id}/candidates")
def list_candidates(
    election_id: str,
    current_user: dict = Depends(require_admin),
):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT c.*, p.position_name
            FROM candidates c
            JOIN positions  p ON c.position_id = p.position_id
            WHERE p.election_id = %s
            ORDER BY p.display_order ASC, c.display_order ASC
            """,
            (election_id,)
        )
        candidates = cursor.fetchall()
        return {"candidates": [dict(c) for c in candidates]}

    finally:
        cursor.close()
        conn.close()


# ════════════════════════════════════════════════════════════
# PUBLIC CANDIDATE PROFILE
# No authentication required.
# ════════════════════════════════════════════════════════════
@router.get("/candidates/{candidate_id}/profile")
def get_candidate_profile(candidate_id: str):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT
                c.candidate_id,
                c.display_name,
                c.manifesto,
                c.photo_url,
                c.approval_status,
                c.display_order,
                p.position_name,
                p.position_id,
                e.title        AS election_title,
                e.election_id,
                e.status       AS election_status
            FROM candidates c
            JOIN positions  p ON c.position_id  = p.position_id
            JOIN elections  e ON p.election_id  = e.election_id
            WHERE c.candidate_id = %s
              AND c.approval_status = 'approved'
            """,
            (candidate_id,)
        )
        candidate = cursor.fetchone()
        if not candidate:
            raise HTTPException(
                status_code=404,
                detail="Candidate not found."
            )
        return dict(candidate)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close(); conn.close()