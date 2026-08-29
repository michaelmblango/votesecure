# One-off E2E test for candidate self-registration.
# Run from backend/ with the venv active:
#   python3 candidate_reg_test.py
# Safe to delete after use - not part of the application.

import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta

from database import get_connection

BASE = "https://votesecure.online/api"
ADMIN_PASSWORD = "VoteSecure@Dev2025!"
CANDIDATE_USERNAME = "priya.candidate"
CANDIDATE_PASSWORD = "TestCandidate@2025!"
CANDIDATE_EMAIL = "votesecure.online+candtest@gmail.com"


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


def login_admin(username):
    status, r = call("POST", "/org/login", {"username": username, "password": ADMIN_PASSWORD})
    assert status == 200, f"admin login step1 failed for {username}: {status} {r}"
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

    status, r = call("POST", "/org/login/otp", {"org_admin_id": org_admin_id, "otp_code": otp})
    assert status == 200, f"admin login step2 failed for {username}: {status} {r}"
    return r["access_token"]


print("=" * 60)
print("CANDIDATE SELF-REGISTRATION — E2E TEST")
print("=" * 60)

print("\n1) Logging in as dev_admin_1 (owner)...")
owner_token = login_admin("dev_admin_1")
print("   OK")

print("\n2) Creating a fresh draft election + position...")
now = datetime.utcnow()
status, r = call("POST", "/elections", {
    "title": "Candidate Registration Test Election",
    "description": "Automated E2E test for candidate self-registration.",
    "election_type": "single_choice",
    "start_time": (now - timedelta(minutes=5)).isoformat(),
    "end_time": (now + timedelta(hours=2)).isoformat(),
    "eligible_group": None,
    "is_public_results": False,
}, owner_token)
print(f"   {status}", r)
assert status == 201
election_id = r["election"]["election_id"]

status, r = call("POST", f"/elections/{election_id}/positions", {
    "position_name": "President", "description": "Test position",
    "max_votes": 1, "display_order": 0,
}, owner_token)
print(f"   {status}", r)
assert status == 201
position_id = r["position"]["position_id"]

print(f"\n3) Sending candidate invite to {CANDIDATE_EMAIL}...")
status, r = call("POST", "/candidate-invites/send", {
    "email": CANDIDATE_EMAIL,
    "election_id": election_id,
    "position_id": position_id,
}, owner_token)
print(f"   {status}", r)
assert status == 201

conn = get_connection()
cursor = conn.cursor()
cursor.execute(
    "SELECT invite_code, invite_id FROM candidate_invites WHERE email=%s ORDER BY created_at DESC LIMIT 1",
    (CANDIDATE_EMAIL,)
)
row = cursor.fetchone()
invite_code = row["invite_code"]
invite_id = str(row["invite_id"])
cursor.close()
conn.close()
print(f"   invite_code: {invite_code[:16]}...")

print("\n4) GET invite details (public)...")
status, r = call("GET", f"/candidate-invites/register/{invite_code}")
print(f"   {status}", r)
assert status == 200
assert r["email"] == CANDIDATE_EMAIL

print(f"\n5) Self-register as candidate '{CANDIDATE_USERNAME}'...")
status, r = call("POST", f"/candidate-invites/register/{invite_code}", {
    "username": CANDIDATE_USERNAME,
    "password": CANDIDATE_PASSWORD,
    "full_name": "Priya Candidate",
    "photo_url": None,
    "party_name": "Progress Alliance",
    "manifesto": "Vote for me, I will do great things.",
})
print(f"   {status}", r)
assert status == 201
candidate_id = r["candidate_id"]

print("\n6) Confirm candidate is NOT visible in public ballot yet (approval_status=pending)...")
status, r = call("GET", f"/elections/{election_id}")
print(f"   {status} positions[0].candidates:", r["positions"][0]["candidates"])
assert len(r["positions"][0]["candidates"]) == 0, "candidate should not be approved yet"

print("\n7) Admin views pending candidate approvals...")
status, r = call("GET", "/candidate-invites/pending", token=owner_token)
print(f"   {status}", r)
assert status == 200
assert any(p["invite_id"] == invite_id for p in r["pending"])

print("\n8) Approve the candidate...")
status, r = call("POST", f"/candidate-invites/{invite_id}/decide", {"approved": True}, owner_token)
print(f"   {status}", r)
assert status == 200

print("\n9) Confirm candidate NOW appears in the election (approved)...")
status, r = call("GET", f"/elections/{election_id}")
candidates = r["positions"][0]["candidates"]
print(f"   {status} positions[0].candidates:", candidates)
assert len(candidates) == 1
assert candidates[0]["candidate_id"] == candidate_id
assert candidates[0]["approval_status"] == "approved"

print("\n10) Confirm candidate's account is now active + can log in...")
status, r = call("POST", "/auth/login", {"identifier": CANDIDATE_USERNAME, "password": CANDIDATE_PASSWORD})
print(f"   {status}", r)
assert status == 200, f"expected 200, got {status}"

print("\n" + "=" * 60)
print("ALL CHECKS PASSED")
print("=" * 60)
print(f"\nElection: {election_id}")
print(f"Candidate: {CANDIDATE_USERNAME} / {CANDIDATE_EMAIL} (candidate_id {candidate_id})")
print("(left in place - delete manually if you want a clean slate)")
