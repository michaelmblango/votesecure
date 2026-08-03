# backend/routers/votes.py
from fastapi import APIRouter
router = APIRouter()

# Endpoints coming soon:
# POST /api/votes/cast
# GET  /api/votes/verify/{vote_hash}
# GET  /api/votes/status/{election_id}