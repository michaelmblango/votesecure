# backend/models/election.py
# ============================================================
# Pydantic models for elections, positions, and candidates
# ============================================================

from pydantic import BaseModel, validator
from typing import Optional
from datetime import datetime


# ── ELECTION ─────────────────────────────────────────────────
class ElectionCreate(BaseModel):
    title:             str
    description:       Optional[str]
    election_type:     str = "single_choice"   # or "multi_choice"
    start_time:        datetime
    end_time:          datetime
    eligible_group:    Optional[str]            # None = all voters eligible
    is_public_results: bool = False
    max_voters:        Optional[int]  = 10
    plan_name:         Optional[str]  = "free"
    licence_id:        Optional[str]  = None

    @validator("election_type")
    def valid_type(cls, v):
        if v not in ("single_choice", "multi_choice"):
            raise ValueError("election_type must be single_choice or multi_choice")
        return v

    @validator("end_time")
    def end_after_start(cls, v, values):
        if "start_time" in values and v <= values["start_time"]:
            raise ValueError("end_time must be after start_time")
        return v


class ElectionUpdate(BaseModel):
    title:             Optional[str]
    description:       Optional[str]
    start_time:        Optional[datetime]
    end_time:          Optional[datetime]
    eligible_group:    Optional[str]
    is_public_results: Optional[bool]


class ElectionStatusUpdate(BaseModel):
    status: str   # draft → active → closed → archived

    @validator("status")
    def valid_status(cls, v):
        allowed = ("draft", "active", "closed", "archived")
        if v not in allowed:
            raise ValueError(f"status must be one of: {allowed}")
        return v


# ── POSITION ─────────────────────────────────────────────────
class PositionCreate(BaseModel):
    position_name:  str
    description:    Optional[str]
    max_votes:      int = 1          # How many candidates a voter picks
    display_order:  int = 0

    @validator("max_votes")
    def max_votes_positive(cls, v):
        if v < 1:
            raise ValueError("max_votes must be at least 1")
        return v


# ── CANDIDATE ────────────────────────────────────────────────
class CandidateCreate(BaseModel):
    display_name:  str
    manifesto:     Optional[str]
    photo_url:     Optional[str]
    display_order: int = 0


class CandidateStatusUpdate(BaseModel):
    approval_status: str   # pending → approved / rejected

    @validator("approval_status")
    def valid_status(cls, v):
        if v not in ("approved", "rejected"):
            raise ValueError("approval_status must be approved or rejected")
        return v