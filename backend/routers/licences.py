# backend/routers/licences.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from database import get_connection
from services.email_service import notify_payment_received
from routers.org_auth import get_current_org_admin

router = APIRouter()


class PaymentReceiptRequest(BaseModel):
    plan_name:         str
    payment_reference: str
    receipt_note:      Optional[str] = None


class LicenceActivate(BaseModel):
    licence_code: str


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

        cursor.execute(
            """
            INSERT INTO payment_requests
                (org_id, org_admin_id, plan_name,
                 amount_usd, payment_reference,
                 receipt_note, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'submitted')
            RETURNING payment_id
            """,
            (
                current["org"],
                current["sub"],
                data.plan_name,
                float(plan["price_usd"]),
                data.payment_reference,
                data.receipt_note,
            )
        )
        payment_id = str(cursor.fetchone()["payment_id"])
        conn.commit()

        from services.email_service import send_payment_receipt_confirmation
        send_payment_receipt_confirmation(
            email=admin["email"],
            name=admin["full_name"],
            org_name=admin["org_name"],
            plan_name=data.plan_name,
            amount_usd=float(plan["price_usd"]),
            payment_reference=data.payment_reference,
            payment_id=payment_id,
        )

        return {
            "message":    (
                f"Payment receipt submitted. You will receive your "
                f"licence code at {admin['email']} once verified."
            ),
            "plan":       data.plan_name,
            "amount":     f"${float(plan['price_usd']):.2f}",
            "payment_id": payment_id,
            "status":     "submitted",
        }
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

        from datetime import datetime
        if lic["expires_at"] and lic["expires_at"] < datetime.utcnow():
            cursor.execute(
                """
                UPDATE election_licences
                SET status = 'expired'
                WHERE licence_id = %s
                """,
                (str(lic["licence_id"]),)
            )
            conn.commit()
            raise HTTPException(
                status_code=400,
                detail=(
                    "This licence code has expired. "
                    "Contact support for a replacement."
                )
            )

        if str(lic["org_id"]) != current["org"]: raise HTTPException(403, "Licence belongs to a different organisation.")

        return {"valid": True, "plan_name": lic["plan_name"], "max_voters": lic["max_voters"], "licence_id": str(lic["licence_id"]), "message": f"Licence valid. You can create an election with up to {lic['max_voters']} voters."}
    except HTTPException: raise
    finally: cursor.close(); conn.close()


@router.get("/my-licences")
def my_licences(current: dict = Depends(get_current_org_admin)):
    conn = get_connection(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT l.licence_code, l.status, l.created_at, l.used_at, p.plan_name, p.max_voters, p.price_usd FROM election_licences l JOIN election_plans p ON l.plan_id=p.plan_id WHERE l.org_id=%s ORDER BY l.created_at DESC", (current["org"],))
        return {"licences": [dict(r) for r in cursor.fetchall()]}
    finally: cursor.close(); conn.close()


@router.get("/payment-history")
def payment_history(current: dict = Depends(get_current_org_admin)):
    conn   = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT
                pr.payment_id,
                pr.plan_name,
                pr.amount_usd,
                pr.payment_reference,
                pr.receipt_note,
                pr.status,
                pr.created_at,
                pr.reviewed_at,
                l.licence_code,
                l.status AS licence_status
            FROM payment_requests pr
            LEFT JOIN election_licences l
                ON pr.licence_id = l.licence_id
            WHERE pr.org_id = %s
            ORDER BY pr.created_at DESC
            """,
            (current["org"],)
        )
        payments = cursor.fetchall()
        return {"payments": [dict(p) for p in payments]}
    finally:
        cursor.close(); conn.close()
