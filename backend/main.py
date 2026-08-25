# backend/main.py
# ============================================================
# VoteSecure - FastAPI Application Entry Point
# This is the first file the server reads on startup
# Run with: uvicorn main:app --reload
# ============================================================

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import test_connection, get_connection

# Import all routers (we will fill these files next)
from routers import auth, elections, votes, analytics
from routers import org_auth, licences
from routers import super_admin
from routers import approvals
from routers import voter_invites


# ── Create the FastAPI app ───────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description="Secure institutional voting and voter authentication platform",
    version="1.0.0",
    # API docs available at /docs (Swagger UI)
    # Alternative docs at /redoc
    docs_url="/docs",
    redoc_url="/redoc",
)


# ── CORS Middleware ──────────────────────────────────────────
# Allows the React frontend (running on port 3000) to send
# requests to this backend (running on port 8000).
# Without this, browsers block all cross-origin requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://votesecure.online",
        "https://www.votesecure.online",
        "https://votesecure.vercel.app",
        os.getenv("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Register Routers ─────────────────────────────────────────
# Each router is a group of related endpoints.
# The prefix means all routes in auth.py start with /api/auth
app.include_router(auth.router,      prefix="/api/auth",      tags=["Authentication"])
app.include_router(elections.router, prefix="/api/elections", tags=["Elections"])
app.include_router(votes.router,     prefix="/api/votes",     tags=["Votes"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(org_auth.router,  prefix="/api/org",      tags=["Organisation Auth"])
app.include_router(licences.router,  prefix="/api/licences", tags=["Licences and Plans"])
app.include_router(
    super_admin.router,
    prefix="/api/super",
    tags=["Super Admin"]
)
app.include_router(
    approvals.router,
    prefix="/api/approvals",
    tags=["Admin Approvals"]
)
app.include_router(
    voter_invites.router,
    prefix="/api/voter-invites",
    tags=["Voter Invites"]
)


# ── Startup Event ────────────────────────────────────────────
# Runs once when the server starts - before accepting requests
@app.on_event("startup")
async def on_startup():
    print(f"\n{'='*50}")
    print(f"  {settings.APP_NAME} API starting...")
    print(f"  Environment: {settings.ENVIRONMENT}")
    print(f"{'='*50}")
    test_connection()
    print(f"  API docs: http://localhost:8000/docs")
    print(f"{'='*50}\n")


# ── Health Check ─────────────────────────────────────────────
# Always include this - deployment systems ping it to check
# if your server is alive and responding
@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "running",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "docs": "http://localhost:8000/docs",
    }


@app.get("/health", tags=["Health"])
def detailed_health():
    db_ok = test_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
    }


# ── Public Stats ──────────────────────────────────────────────
# Safe, unauthenticated aggregate counts for the public landing
# page's social-proof section. No PII, no org names, no identifying
# detail - just totals. (Full detail lives behind /api/super/stats,
# which requires super-admin auth.)
@app.get("/api/public/stats", tags=["Public"])
def public_stats():
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT COUNT(*) AS total FROM votes")
        total_votes = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) AS total FROM elections")
        total_elections = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) AS total FROM organisations WHERE status = 'active'")
        active_orgs = cursor.fetchone()["total"]

        return {
            "votes": total_votes,
            "elections": total_elections,
            "active_organisations": active_orgs,
        }
    finally:
        cursor.close(); conn.close()