# backend/routers/analytics.py
# ============================================================
# Results and analytics endpoints
#
# GET /api/analytics/results/{election_id}  — Vote counts
# GET /api/analytics/turnout/{election_id}  — Turnout stats
# GET /api/analytics/audit-logs             — Audit trail (admin)
# ============================================================

from fastapi import APIRouter, HTTPException, Depends
from database import get_connection
from dependencies import get_current_user, require_admin

router = APIRouter()


# ════════════════════════════════════════════════════════════
# ELECTION RESULTS
# Returns vote counts per candidate per position.
# Only available if election is closed OR admin is asking
# OR election has is_public_results = TRUE
# ════════════════════════════════════════════════════════════
@router.get("/results/{election_id}")
def get_results(
    election_id: str,
    current_user: dict = Depends(get_current_user),
):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        # Check election exists and access rules
        cursor.execute(
            "SELECT * FROM elections WHERE election_id = %s",
            (election_id,)
        )
        election = cursor.fetchone()
        if not election:
            raise HTTPException(status_code=404, detail="Election not found.")

        role = current_user.get("role", "voter")
        is_admin = role in ("system_admin", "election_admin", "auditor")

        # Voters can only see results if election is closed
        # or the admin enabled public live results
        if not is_admin:
            if election["status"] not in ("closed", "archived"):
                if not election["is_public_results"]:
                    raise HTTPException(
                        status_code=403,
                        detail="Results are not yet available. Election is still active.",
                    )

        # Fetch results grouped by position then candidate
        cursor.execute(
            """
            SELECT
                p.position_id,
                p.position_name,
                c.candidate_id,
                c.display_name  AS candidate_name,
                c.photo_url,
                COUNT(v.vote_id) AS vote_count
            FROM positions  p
            JOIN candidates c ON c.position_id   = p.position_id
            LEFT JOIN votes v ON v.candidate_id  = c.candidate_id
                              AND v.election_id  = %s
            WHERE p.election_id      = %s
              AND c.approval_status  = 'approved'
            GROUP BY p.position_id, p.position_name,
                     c.candidate_id, c.display_name, c.photo_url
            ORDER BY p.display_order ASC, vote_count DESC
            """,
            (election_id, election_id)
        )
        rows = cursor.fetchall()

        # Get total votes cast in this election
        cursor.execute(
            "SELECT COUNT(*) AS total FROM votes WHERE election_id = %s",
            (election_id,)
        )
        total_votes = cursor.fetchone()["total"]

        # Get total registered voters
        cursor.execute("SELECT COUNT(*) AS total FROM voters")
        total_voters = cursor.fetchone()["total"]

        # Organise by position
        positions = {}
        for row in rows:
            pos_id = str(row["position_id"])
            if pos_id not in positions:
                positions[pos_id] = {
                    "position_id":   pos_id,
                    "position_name": row["position_name"],
                    "candidates":    [],
                    "total_votes":   0,
                }
            vote_count = int(row["vote_count"])
            positions[pos_id]["candidates"].append({
                "candidate_id":   str(row["candidate_id"]),
                "candidate_name": row["candidate_name"],
                "photo_url":      row["photo_url"],
                "vote_count":     vote_count,
            })
            positions[pos_id]["total_votes"] += vote_count

        # Add percentages and determine winner per position
        for pos in positions.values():
            pos_total = pos["total_votes"]
            for c in pos["candidates"]:
                c["percentage"] = (
                    round(c["vote_count"] / pos_total * 100, 1)
                    if pos_total > 0 else 0
                )
            # Winner = candidate with most votes
            if pos["candidates"]:
                pos["winner"] = max(
                    pos["candidates"], key=lambda x: x["vote_count"]
                )["candidate_name"]

        turnout_pct = round(total_votes / total_voters * 100, 1) if total_voters > 0 else 0

        return {
            "election_title":  election["title"],
            "election_status": election["status"],
            "total_votes_cast": total_votes,
            "total_registered": total_voters,
            "turnout_percent":  turnout_pct,
            "positions":        list(positions.values()),
        }

    finally:
        cursor.close()
        conn.close()


# ════════════════════════════════════════════════════════════
# TURNOUT BREAKDOWN BY DEPARTMENT
# ════════════════════════════════════════════════════════════
@router.get("/turnout/{election_id}")
def get_turnout(
    election_id: str,
    current_user: dict = Depends(require_admin),
):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        # Registered voters by department
        cursor.execute(
            """
            SELECT department, COUNT(*) AS registered
            FROM voters
            GROUP BY department
            ORDER BY department
            """
        )
        registered = {r["department"]: r["registered"] for r in cursor.fetchall()}

        # Voters who voted in this election, by department
        cursor.execute(
            """
            SELECT vt.department, COUNT(DISTINCT ves.voter_id) AS voted
            FROM voter_election_status ves
            JOIN voters vt ON ves.voter_id = vt.voter_id
            WHERE ves.election_id = %s
              AND ves.has_voted   = TRUE
            GROUP BY vt.department
            """,
            (election_id,)
        )
        voted = {r["department"]: r["voted"] for r in cursor.fetchall()}

        breakdown = []
        for dept, reg_count in registered.items():
            voted_count = voted.get(dept, 0)
            breakdown.append({
                "department":    dept or "Unknown",
                "registered":    reg_count,
                "voted":         voted_count,
                "turnout_rate":  round(voted_count / reg_count * 100, 1) if reg_count > 0 else 0,
            })

        return {"turnout_by_department": breakdown}

    finally:
        cursor.close()
        conn.close()


# ════════════════════════════════════════════════════════════
# AUDIT LOG VIEWER — admin only
# ════════════════════════════════════════════════════════════
@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 100,
    event_type: str = None,
    current_user: dict = Depends(require_admin),
):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        if event_type:
            cursor.execute(
                """
                SELECT al.*, u.full_name AS actor_name
                FROM audit_logs al
                LEFT JOIN users u ON al.actor_id = u.user_id
                WHERE al.event_type = %s
                ORDER BY al.timestamp DESC
                LIMIT %s
                """,
                (event_type, limit)
            )
        else:
            cursor.execute(
                """
                SELECT al.*, u.full_name AS actor_name
                FROM audit_logs al
                LEFT JOIN users u ON al.actor_id = u.user_id
                ORDER BY al.timestamp DESC
                LIMIT %s
                """,
                (limit,)
            )

        logs = cursor.fetchall()
        return {"audit_logs": [dict(log) for log in logs]}

    finally:
        cursor.close()
        conn.close()