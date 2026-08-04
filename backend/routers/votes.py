# backend/routers/votes.py
# ============================================================
# Voting endpoints
#
# POST /api/votes/cast              — Cast a vote (voter)
# GET  /api/votes/status/{election} — Check if voter has voted
# GET  /api/votes/verify/{hash}     — Public vote verification
# ============================================================

import hashlib
from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel
from database import get_connection
from dependencies import get_current_user
from datetime import datetime

router = APIRouter()


# ── Input model ───────────────────────────────────────────────
class VoteCast(BaseModel):
    election_id:  str
    position_id:  str
    candidate_id: str


# ── Vote hash generator ───────────────────────────────────────
def make_vote_hash(vote_id: str, election_id: str,
                   candidate_id: str, cast_at: str) -> str:
    """
    Create a SHA-256 fingerprint of a vote.
    If anyone changes candidate_id in the database later,
    the hash will no longer match — tampering detected.
    """
    content = f"{vote_id}|{election_id}|{candidate_id}|{cast_at}"
    return hashlib.sha256(content.encode()).hexdigest()


# ════════════════════════════════════════════════════════════
# CAST A VOTE
# The most critical endpoint in the entire system.
# Enforces every business rule before recording the vote.
# ════════════════════════════════════════════════════════════
@router.post("/cast", status_code=status.HTTP_201_CREATED)
def cast_vote(
    data: VoteCast,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """
    Cast a vote for a candidate in a specific position.

    Rules enforced (all server-side — cannot be bypassed):
    1. Election must be active and within its time window
    2. Voter must be eligible for this election
    3. Voter must not have already voted for this position
    4. Candidate must be approved and belong to this position

    Records vote anonymously — no voter_id in votes table.
    Records participation separately — no candidate_id there.
    """
    conn   = get_connection()
    cursor = conn.cursor()

    try:
        user_id = current_user["sub"]

        # ── Get voter_id from user_id ─────────────────────
        cursor.execute(
            "SELECT voter_id, eligibility_group FROM voters WHERE user_id = %s",
            (user_id,)
        )
        voter_row = cursor.fetchone()
        if not voter_row:
            raise HTTPException(
                status_code=403,
                detail="Only registered voters can cast votes.",
            )
        voter_id          = str(voter_row["voter_id"])
        eligibility_group = voter_row["eligibility_group"]

        # ── RULE 1: Election must exist and be active ─────
        cursor.execute(
            """
            SELECT election_id, title, status, start_time,
                   end_time, eligible_group
            FROM elections
            WHERE election_id = %s
            """,
            (data.election_id,)
        )
        election = cursor.fetchone()
        if not election:
            raise HTTPException(status_code=404, detail="Election not found.")

        if election["status"] != "active":
            raise HTTPException(
                status_code=400,
                detail=f"This election is not currently active. Status: {election['status']}",
            )

        now = datetime.utcnow()
        if now < election["start_time"].replace(tzinfo=None):
            raise HTTPException(status_code=400, detail="Voting has not started yet.")
        if now > election["end_time"].replace(tzinfo=None):
            raise HTTPException(status_code=400, detail="Voting period has ended.")

        # ── RULE 2: Voter eligibility ─────────────────────
        if election["eligible_group"] and eligibility_group:
            if election["eligible_group"] != eligibility_group:
                raise HTTPException(
                    status_code=403,
                    detail="You are not eligible to vote in this election.",
                )

        # ── RULE 3: Has this voter already voted here? ────
        cursor.execute(
            """
            SELECT has_voted FROM voter_election_status
            WHERE voter_id    = %s
              AND election_id = %s
              AND position_id = %s
            """,
            (voter_id, data.election_id, data.position_id)
        )
        existing = cursor.fetchone()
        if existing and existing["has_voted"]:
            raise HTTPException(
                status_code=409,
                detail="You have already voted for this position. Each voter may only vote once.",
            )

        # ── RULE 4: Candidate must be approved ───────────
        cursor.execute(
            """
            SELECT candidate_id, display_name
            FROM candidates
            WHERE candidate_id  = %s
              AND position_id   = %s
              AND approval_status = 'approved'
            """,
            (data.candidate_id, data.position_id)
        )
        candidate = cursor.fetchone()
        if not candidate:
            raise HTTPException(
                status_code=400,
                detail="Invalid candidate. They may not be approved for this position.",
            )

        # ══ ALL RULES PASSED — Record the vote ═══════════

        # Generate vote timestamp and hash
        cast_at   = datetime.utcnow().isoformat()
        ip        = str(request.client.host)

        # Insert anonymous vote (NO voter_id here)
        cursor.execute(
            """
            INSERT INTO votes
                (election_id, position_id, candidate_id, ip_address)
            VALUES (%s, %s, %s, %s)
            RETURNING vote_id, cast_at
            """,
            (data.election_id, data.position_id, data.candidate_id, ip)
        )
        new_vote = cursor.fetchone()
        vote_id  = str(new_vote["vote_id"])
        cast_at  = str(new_vote["cast_at"])

        # Generate and store integrity hash
        vote_hash = make_vote_hash(
            vote_id, data.election_id, data.candidate_id, cast_at
        )
        cursor.execute(
            "UPDATE votes SET vote_hash = %s WHERE vote_id = %s",
            (vote_hash, vote_id)
        )

        # Record participation (voter_id here, NO candidate_id)
        cursor.execute(
            """
            INSERT INTO voter_election_status
                (voter_id, election_id, position_id, has_voted, voted_at)
            VALUES (%s, %s, %s, TRUE, NOW())
            ON CONFLICT (voter_id, election_id, position_id)
            DO UPDATE SET has_voted = TRUE, voted_at = NOW()
            """,
            (voter_id, data.election_id, data.position_id)
        )

        # Audit log — records that vote was cast, NOT who for
        cursor.execute(
            """
            INSERT INTO audit_logs
                (actor_id, actor_type, event_type, event_description, ip_address)
            VALUES (%s, 'voter', 'VOTE_CAST', %s, %s)
            """,
            (
                user_id,
                f"Vote cast in election '{election['title']}'",
                ip,
            )
        )

        conn.commit()

        return {
            "message":   "Your vote has been recorded successfully.",
            "vote_hash": vote_hash,
            "cast_at":   cast_at,
            "receipt":   f"Keep this code to verify your vote: {vote_hash[:16]}...",
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Vote failed: {str(e)}")
    finally:
        cursor.close()
        conn.close()


# ════════════════════════════════════════════════════════════
# CHECK VOTING STATUS
# Has this voter voted in a given election?
# ════════════════════════════════════════════════════════════
@router.get("/status/{election_id}")
def get_voting_status(
    election_id: str,
    current_user: dict = Depends(get_current_user),
):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT voter_id FROM voters WHERE user_id = %s",
            (current_user["sub"],)
        )
        voter = cursor.fetchone()
        if not voter:
            return {"has_voted": False}

        cursor.execute(
            """
            SELECT position_id, has_voted, voted_at
            FROM voter_election_status
            WHERE voter_id    = %s
              AND election_id = %s
            """,
            (str(voter["voter_id"]), election_id)
        )
        statuses = cursor.fetchall()

        return {
            "election_id": election_id,
            "positions_voted": [dict(s) for s in statuses],
            "fully_voted": all(s["has_voted"] for s in statuses) if statuses else False,
        }

    finally:
        cursor.close()
        conn.close()


# ════════════════════════════════════════════════════════════
# VERIFY A VOTE — public endpoint, no auth required
# Any voter can confirm their vote was counted
# ════════════════════════════════════════════════════════════
@router.get("/verify/{vote_hash}")
def verify_vote(vote_hash: str):
    """
    Public endpoint — no login required.
    Voter submits their vote_hash receipt and confirms
    their vote exists and has not been tampered with.
    Does NOT reveal who cast the vote.
    """
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT v.vote_id, v.election_id, v.candidate_id,
                   v.vote_hash, v.cast_at,
                   e.title   AS election_title,
                   c.display_name AS candidate_name,
                   p.position_name
            FROM votes     v
            JOIN elections e ON v.election_id  = e.election_id
            JOIN candidates c ON v.candidate_id = c.candidate_id
            JOIN positions  p ON v.position_id  = p.position_id
            WHERE v.vote_hash = %s
            """,
            (vote_hash,)
        )
        vote = cursor.fetchone()
        if not vote:
            return {
                "verified": False,
                "message":  "No vote found with this receipt code.",
            }

        # Recompute hash to check integrity
        recalculated = make_vote_hash(
            str(vote["vote_id"]),
            str(vote["election_id"]),
            str(vote["candidate_id"]),
            str(vote["cast_at"]),
        )
        integrity_ok = (recalculated == vote["vote_hash"])

        return {
            "verified":        True,
            "integrity_ok":    integrity_ok,
            "election":        vote["election_title"],
            "position":        vote["position_name"],
            "candidate_voted": vote["candidate_name"],
            "cast_at":         str(vote["cast_at"]),
            "message": (
                "✅ Your vote was recorded and has not been tampered with."
                if integrity_ok else
                "⚠️ Warning: Vote record integrity check failed."
            ),
        }

    finally:
        cursor.close()
        conn.close()