# One-off E2E test for the redesigned voter registration flow.
# Run from backend/ with the venv active:
#   python3 voter_reg_redesign_test.py
# Safe to delete after use - not part of the application.

import json
import urllib.request
import urllib.error

from database import get_connection
from services.auth_service import redis_client

BASE = "https://votesecure.online/api"
ADMIN_PASSWORD = "VoteSecure@Dev2025!"
VOTER_USERNAME = "erin.tester"
VOTER_PASSWORD = "TestVoter@2025!"


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
print("VOTER REGISTRATION REDESIGN — E2E TEST")
print("=" * 60)

print("\n1) Logging in as dev_admin_1 (owner) to send an invite...")
owner_token = login_admin("dev_admin_1")
print("   OK")

test_email = "votesecure.online+regredesign@gmail.com"
print(f"\n2) Sending voter invite to {test_email}...")
status, r = call("POST", "/voter-invites/send", {"email": test_email}, owner_token)
print(f"   {status}", r)
assert status == 201, f"expected 201, got {status}"

conn = get_connection()
cursor = conn.cursor()
cursor.execute(
    "SELECT invite_code, invite_id FROM voter_invites WHERE email=%s ORDER BY created_at DESC LIMIT 1",
    (test_email,)
)
row = cursor.fetchone()
invite_code = row["invite_code"]
invite_id = str(row["invite_id"])
cursor.close()
conn.close()
print(f"   invite_code: {invite_code}")

print("\n3) GET invite details (public)...")
status, r = call("GET", f"/voter-invites/register/{invite_code}")
print(f"   {status}", r)
assert status == 200
assert r["email"] == test_email

print(f"\n4) Self-register as username '{VOTER_USERNAME}'...")
status, r = call("POST", f"/voter-invites/register/{invite_code}", {
    "username": VOTER_USERNAME,
    "password": VOTER_PASSWORD,
    "full_name": "Erin Tester",
    "department": "Computer Science",
})
print(f"   {status}", r)
assert status == 201, f"expected 201, got {status}"

print("\n5) Attempt voter login BEFORE approval (expect 401/403 — account inactive)...")
status, r = call("POST", "/auth/login", {"identifier": VOTER_USERNAME, "password": VOTER_PASSWORD})
print(f"   {status}", r)
assert status in (401, 403), f"expected 401/403 while unapproved, got {status}"

# approvals_needed = max(2, total_active_admins - 1) = max(2, 3-1) = 2
# for the 3-admin dev org, so only 2 of the 3 admins need to approve.
admins = ["dev_admin_1", "dev_admin_2"]
for i, admin_username in enumerate(admins, start=1):
    print(f"\n6.{i}) Logging in as {admin_username} and approving...")
    token = login_admin(admin_username)
    status, r = call("POST", f"/voter-invites/{invite_id}/decide", {"approved": True}, token)
    print(f"   {status}", r)
    assert status == 200, f"approval vote failed: {status} {r}"

print("\n7) Voter login via USERNAME (step 1)...")
status, r = call("POST", "/auth/login", {"identifier": VOTER_USERNAME, "password": VOTER_PASSWORD})
print(f"   {status}", r)
assert status == 200, f"expected 200, got {status}"
voter_user_id = r["user_id"]

otp_code = redis_client.get(f"otp:{voter_user_id}")
print("   Voter OTP:", otp_code)

print("\n8) Voter login step 2 (OTP)...")
status, r = call("POST", "/auth/login/otp", {"user_id": voter_user_id, "otp_code": otp_code})
print(f"   {status}", r)
assert status == 200, f"expected 200, got {status}"
assert r["role"] == "voter"

print("\n9) Voter login via EMAIL instead of username (step 1)...")
status, r = call("POST", "/auth/login", {"identifier": test_email, "password": VOTER_PASSWORD})
print(f"   {status}", r)
assert status == 200, f"expected 200 logging in via email, got {status}"

print("\n" + "=" * 60)
print("ALL CHECKS PASSED")
print("=" * 60)
print(f"\nCreated voter: {VOTER_USERNAME} / {test_email} (user_id {voter_user_id})")
print("(left in place - delete manually if you want a clean slate)")
