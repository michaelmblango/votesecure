# backend/routers/licences.py

import secrets
import string
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import Optional

from database import get_connection
from services.email_service import notify_payment_received, send_licence_code
from config import settings
from routers.org_auth import get_current_org_admin

router = APIRouter()


def make_licence_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return ("".join(secrets.choice(chars) for _ in range(4)) + "-" +
            "".join(secrets.choice(chars) for _ in range(4)) + "-" +
            "".join(secrets.choice(chars) for _ in range(4)))


class PaymentReceiptRequest(BaseModel):
    plan_name:         str
    payment_reference: str
    receipt_note:      Optional[str] = None


class LicenceActivate(BaseModel):
    licence_code: str


class LicenceGenerate(BaseModel):
    org_id:    str
    plan_name: str
    notes:     Optional[str] = None


@router.get("/plans")
def get_plans():
    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM election_plans WHERE is_active=TRUE ORDER BY display_order")
        return {"plans": [dict(p) for p in cursor.fetchall()]}
    finally: cursor.close(); conn.close()


@router.post("/request")
def request_licence(data: PaymentReceiptRequest, current: dict = Depends(get_current_org_admin)):
    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM election_plans WHERE plan_name=%s AND is_active=TRUE", (data.plan_name,))
        plan = cursor.fetchone()
        if not plan: raise HTTPException(400, f"Plan '{data.plan_name}' not found.")
        if plan["price_usd"] == 0: raise HTTPException(400, "Free plan does not require payment.")

        cursor.execute("SELECT a.full_name, a.email, o.org_name FROM org_admins a JOIN organisations o ON a.org_id=o.org_id WHERE a.org_admin_id=%s", (current["sub"],))
        admin = cursor.fetchone()

        notify_payment_received(org_name=admin["org_name"], admin_name=admin["full_name"], admin_email=admin["email"], plan_name=data.plan_name, max_voters=plan["max_voters"], price_usd=float(plan["price_usd"]), payment_reference=data.payment_reference, receipt_note=data.receipt_note)

        return {"message": f"Receipt submitted. Your licence code will be emailed to {admin['email']} after verification.", "plan": data.plan_name, "amount": f"${float(plan['price_usd']):.2f}"}
    except HTTPException: raise
    except Exception as e: conn.rollback(); raise HTTPException(500, str(e))
    finally: cursor.close(); conn.close()


@router.post("/activate")
def activate_licence(data: LicenceActivate, current: dict = Depends(get_current_org_admin)):
    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT l.*, p.plan_name, p.max_voters FROM election_licences l JOIN election_plans p ON l.plan_id=p.plan_id WHERE l.licence_code=%s", (data.licence_code.upper().strip(),))
        lic = cursor.fetchone()
        if not lic: raise HTTPException(404, "Licence code not found.")
        if lic["status"] == "used": raise HTTPException(400, "Licence already used.")
        if lic["status"] in ("expired","revoked"): raise HTTPException(400, f"Licence is {lic['status']}.")
        if str(lic["org_id"]) != current["org"]: raise HTTPException(403, "Licence belongs to a different organisation.")

        return {"valid": True, "plan_name": lic["plan_name"], "max_voters": lic["max_voters"], "licence_id": str(lic["licence_id"]), "message": f"Licence valid. You can create an election with up to {lic['max_voters']} voters."}
    except HTTPException: raise
    finally: cursor.close(); conn.close()


@router.post("/generate")
def generate_licence(data: LicenceGenerate, x_super_key: Optional[str] = Header(default=None)):
    if x_super_key != settings.SUPER_ADMIN_JWT_SECRET:
        raise HTTPException(403, "Not authorised.")

    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM election_plans WHERE plan_name=%s", (data.plan_name,))
        plan = cursor.fetchone()
        if not plan: raise HTTPException(400, "Plan not found.")

        cursor.execute("SELECT org_name FROM organisations WHERE org_id=%s", (data.org_id,))
        org = cursor.fetchone()
        if not org: raise HTTPException(404, "Organisation not found.")

        cursor.execute("SELECT full_name, email FROM org_admins WHERE org_id=%s AND is_owner=TRUE LIMIT 1", (data.org_id,))
        owner = cursor.fetchone()

        while True:
            code = make_licence_code()
            cursor.execute("SELECT licence_id FROM election_licences WHERE licence_code=%s", (code,))
            if not cursor.fetchone(): break

        cursor.execute("INSERT INTO election_licences (licence_code, org_id, plan_id, notes) VALUES (%s,%s,%s,%s) RETURNING licence_id", (code, data.org_id, str(plan["plan_id"]), data.notes))
        lic_id = str(cursor.fetchone()["licence_id"])
        conn.commit()

        if owner:
            send_licence_code(email=owner["email"], name=owner["full_name"], org_name=org["org_name"], licence_code=code, plan_name=data.plan_name, max_voters=plan["max_voters"])

        return {"licence_code": code, "licence_id": lic_id, "plan": data.plan_name, "max_voters": plan["max_voters"], "org": org["org_name"], "emailed_to": owner["email"] if owner else "no owner found"}
    except HTTPException: raise
    except Exception as e: conn.rollback(); raise HTTPException(500, str(e))
    finally: cursor.close(); conn.close()


@router.get("/my-licences")
def my_licences(current: dict = Depends(get_current_org_admin)):
    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT l.licence_code, l.status, l.created_at, l.used_at, p.plan_name, p.max_voters, p.price_usd FROM election_licences l JOIN election_plans p ON l.plan_id=p.plan_id WHERE l.org_id=%s ORDER BY l.created_at DESC", (current["org"],))
        return {"licences": [dict(r) for r in cursor.fetchall()]}
    finally: cursor.close(); conn.close()
