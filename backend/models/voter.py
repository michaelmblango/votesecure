# backend/models/voter.py
# ============================================================
# Pydantic models for voter and user data
# These define what data the API expects to RECEIVE
# and what it sends back in RESPONSES
# FastAPI validates all incoming data against these automatically
# ============================================================

from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import datetime


# ── REGISTRATION ─────────────────────────────────────────────
class VoterRegister(BaseModel):
    """
    Data required to register a new voter.
    Sent by the admin when adding a voter to the system.
    """
    full_name:         str
    email:             EmailStr        # Pydantic validates email format automatically
    student_number:    str             # Unique college registration number
    password:          str             # Will be hashed before storage — never stored plain
    department:        Optional[str]   # e.g. "Computer Science"
    level:             Optional[str]   # e.g. "400"
    eligibility_group: Optional[str]   # e.g. "undergraduate"
    phone_number:      Optional[str]

    @validator("password")
    def password_must_be_strong(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @validator("student_number")
    def student_number_no_spaces(cls, v):
        if " " in v.strip():
            raise ValueError("Student number cannot contain spaces")
        return v.strip().upper()


# ── LOGIN ────────────────────────────────────────────────────
class VoterLogin(BaseModel):
    """
    Data required for Step 1 of login.
    Voter submits their student number and password.
    """
    student_number: str
    password:       str


class OTPVerify(BaseModel):
    """
    Data required for Step 2 of login (OTP verification).
    Voter submits the 6-digit code sent to their email.
    """
    user_id:  str
    otp_code: str


# ── RESPONSES ────────────────────────────────────────────────
class UserResponse(BaseModel):
    """
    Safe user data returned in API responses.
    NEVER includes password_hash or sensitive fields.
    """
    user_id:    str
    full_name:  str
    email:      str
    role:       str
    is_active:  bool
    created_at: str


class VoterResponse(BaseModel):
    """
    Full voter profile returned after successful login or profile fetch.
    """
    user_id:           str
    voter_id:          str
    full_name:         str
    email:             str
    student_number:    str
    department:        Optional[str]
    level:             Optional[str]
    eligibility_group: Optional[str]
    role:              str
    is_active:         bool


class LoginStep1Response(BaseModel):
    """
    Returned after password verification passes.
    Tells the frontend to show the OTP input screen.
    """
    status:   str        # Always "otp_required"
    user_id:  str        # Needed for Step 2
    message:  str        # e.g. "Code sent to m***@gmail.com"


class LoginSuccessResponse(BaseModel):
    """
    Returned after full authentication (password + OTP) succeeds.
    The access_token is the JWT — frontend stores this and sends
    it with every future request in the Authorization header.
    """
    status:         str   # Always "authenticated"
    access_token:   str   # JWT token
    token_type:     str   # Always "bearer"
    user_id:        str
    full_name:      str
    role:           str