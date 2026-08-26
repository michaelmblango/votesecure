# One-off test script for the public results sharing feature.
# Run from backend/ with the venv active:
#   python3 scripts/public_results_e2e_test.py
# Safe to delete after use - not part of the application.

import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta

from database import get_connection
from services.auth_service import redis_client

BASE = "https://votesecure.online/api"


def call(method, path, body=None, token=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())


print("1) Admin login step 1...")
status, r = call("POST", "/org/login", {"username": "dev_admin_1", "password": "VoteSecure@Dev2025!"})
print(status, r)
org_admin_id = r["org_admin_id"]

conn = get_connection()
cursor = conn.cursor()
cursor.execute(
    "SELECT otp_code FROM org_admin_otp WHERE org_admin_id=%s ORDER BY created_at DESC LIMIT 1",
    (org_admin_id,)
)
otp = cursor.fetchone()["otp_code"]
cursor.close()
conn.close()
print("Admin OTP:", otp)

print("2) Admin login step 2...")
status, r = call("POST", "/org/login/otp", {"org_admin_id": org_admin_id, "otp_code": otp})
print(status, r)
admin_token = r["access_token"]

print("3) Create election...")
now = datetime.utcnow()
election_body = {
    "title": "Public Results Test Election",
    "description": "Automated end-to-end test for public results sharing.",
    "election_type": "single_choice",
    "start_time": (now - timedelta(minutes=5)).isoformat(),
    "end_time": (now + timedelta(hours=2)).isoformat(),
    "eligible_group": None,
    "is_public_results": False,
}
status, r = call("POST", "/elections", election_body, admin_token)
print(status, r)
election_id = r["election"]["election_id"]

print("4) Add position...")
status, r = call(
    "POST", f"/elections/{election_id}/positions",
    {"position_name": "President", "description": "Test position", "max_votes": 1, "display_order": 0},
    admin_token
)
print(status, r)
position_id = r["position"]["position_id"]

print("5) Add candidates...")
status, r = call(
    "POST", f"/elections/{election_id}/positions/{position_id}/candidates",
    {"display_name": "Test Candidate A", "manifesto": "Vote for me A", "photo_url": None}, admin_token
)
print(status, r)
cand_a = r["candidate"]["candidate_id"]

status, r = call(
    "POST", f"/elections/{election_id}/positions/{position_id}/candidates",
    {"display_name": "Test Candidate B", "manifesto": "Vote for me B", "photo_url": None}, admin_token
)
print(status, r)
cand_b = r["candidate"]["candidate_id"]

print("6) Approve candidates...")
status, r = call("PATCH", f"/elections/{election_id}/candidates/{cand_a}/status", {"approval_status": "approved"}, admin_token)
print(status, r)
status, r = call("PATCH", f"/elections/{election_id}/candidates/{cand_b}/status", {"approval_status": "approved"}, admin_token)
print(status, r)

print("7) Open election (draft -> active)...")
status, r = call("PATCH", f"/elections/{election_id}/status", {"status": "active"}, admin_token)
print(status, r)

print("8) Voter login step 1...")
status, r = call("POST", "/auth/login", {"student_number": "DEV/2025/001", "password": "VoteSecure@Dev2025!"})
print(status, r)
voter_user_id = r["user_id"]

otp_code = redis_client.get(f"otp:{voter_user_id}")
print("Voter OTP:", otp_code)

print("9) Voter login step 2...")
status, r = call("POST", "/auth/login/otp", {"user_id": voter_user_id, "otp_code": otp_code})
print(status, r)
voter_token = r["access_token"]

print("10) Cast vote for Candidate A...")
status, r = call(
    "POST", "/votes/cast",
    {"election_id": election_id, "position_id": position_id, "candidate_id": cand_a},
    voter_token
)
print(status, r)

print("11) Close election (active -> closed)...")
status, r = call("PATCH", f"/elections/{election_id}/status", {"status": "closed"}, admin_token)
print(status, r)

print("12) Fetch PUBLIC results (no auth)...")
status, r = call("GET", f"/analytics/public/results/{election_id}")
print(status)
print(json.dumps(r, indent=2))

print()
print("ELECTION_ID:", election_id)
