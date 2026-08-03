# backend/dependencies.py
# ============================================================
# FastAPI dependency functions
# These are injected into endpoints that require authentication
# Usage: add  current_user: dict = Depends(get_current_user)
#        to any endpoint function parameter
# ============================================================

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.auth_service import verify_access_token

# Tells FastAPI to look for: Authorization: Bearer <token>
# in the request headers
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Extract and verify the JWT token from the request header.
    Returns the token payload (contains user_id and role).

    Use this on ANY endpoint that requires a logged-in user:

        @router.get("/my-endpoint")
        def my_endpoint(current_user: dict = Depends(get_current_user)):
            user_id = current_user["sub"]
            role    = current_user["role"]
    """
    token = credentials.credentials
    return verify_access_token(token)


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Require the user to be an election_admin or system_admin.
    Raises HTTP 403 if they are just a voter.

    Use this on admin-only endpoints:

        @router.post("/elections")
        def create_election(current_user: dict = Depends(require_admin)):
            ...
    """
    role = current_user.get("role", "")
    if role not in ("election_admin", "system_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action.",
        )
    return current_user


def require_system_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Require the user to be specifically a system_admin.
    The highest privilege level — used for user management.
    """
    if current_user.get("role") != "system_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System administrator access required.",
        )
    return current_user