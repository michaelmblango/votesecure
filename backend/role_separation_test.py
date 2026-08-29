# One-off test script for role separation (owner vs co-admin).
# Run from backend/ with the venv active:
#   python3 role_separation_test.py
# Safe to delete after use - not part of the application.

import json
import urllib.request
import urllib.error

from database import get_connection

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


def login(username, password):
    status, r = call("POST", "/org/login", {"username": username, "password": password})
    assert status == 200, f"login step1 failed for {username}: {status} {r}"
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
    assert status == 200, f"login step2 failed for {username}: {status} {r}"
    return r["access_token"]


PASSWORD = "VoteSecure@Dev2025!"

print("=" * 60)
print("ROLE SEPARATION TEST — owner vs co-admin")
print("=" * 60)

print("\n1) Logging in as dev_admin_1 (owner)...")
owner_token = login("dev_admin_1", PASSWORD)
print("   OK")

print("\n2) Logging in as dev_admin_2 (co-admin)...")
coadmin_token = login("dev_admin_2", PASSWORD)
print("   OK")

print("\n3) GET /org/me/role as owner...")
status, r = call("GET", "/org/me/role", token=owner_token)
print(f"   {status}", json.dumps(r, indent=2))
assert status == 200
assert r["is_owner"] is True
assert r["permissions"]["can_create_elections"] is True

print("\n4) GET /org/me/role as co-admin...")
status, r = call("GET", "/org/me/role", token=coadmin_token)
print(f"   {status}", json.dumps(r, indent=2))
assert status == 200
assert r["is_owner"] is False
assert r["permissions"]["can_create_elections"] is False

election_body = {
    "title": "Role Separation Test Election",
    "description": "Automated test - verifying owner-only enforcement.",
    "election_type": "single_choice",
    "start_time": "2026-09-01T00:00:00",
    "end_time":   "2026-09-02T00:00:00",
    "eligible_group": None,
    "is_public_results": False,
}

print("\n5) POST /elections as co-admin (expect 403)...")
status, r = call("POST", "/elections", election_body, coadmin_token)
print(f"   {status}", r)
assert status == 403, f"expected 403, got {status}"

print("\n6) POST /elections as owner (expect 201)...")
status, r = call("POST", "/elections", election_body, owner_token)
print(f"   {status}", r)
assert status == 201, f"expected 201, got {status}"
election_id = r["election"]["election_id"]
print(f"   Created election_id: {election_id}")

print("\n7) POST /voter-invites/send as co-admin (expect 403)...")
status, r = call(
    "POST", "/voter-invites/send",
    {"email": "role-test-voter@example.com"},
    coadmin_token
)
print(f"   {status}", r)
assert status == 403, f"expected 403, got {status}"

print("\n" + "=" * 60)
print("ALL CHECKS PASSED")
print("=" * 60)
print(f"\nTest election created: {election_id}")
print("(left in place - delete manually if you want a clean slate)")
