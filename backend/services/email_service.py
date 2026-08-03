# backend/services/email_service.py
# ============================================================
# Email delivery service for VoteSecure
# Used to send OTP codes to voters during login
# ============================================================

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings


def send_otp_email(recipient_email: str, voter_name: str, otp_code: str) -> bool:
    """
    Send a one-time password code to a voter's email address.

    Returns True if sent successfully, False if it failed.
    We never crash the login flow over an email failure —
    in development, we just print the OTP to the terminal.
    """

    # ── Development Mode ──────────────────────────────────
    # If no SMTP credentials are configured, print the OTP
    # to the terminal instead of sending an email.
    # This lets you test the full login flow without Gmail setup.
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"\n{'='*40}")
        print(f"  [DEV MODE] OTP for {voter_name}")
        print(f"  Code: {otp_code}")
        print(f"  (Configure SMTP in .env to send real emails)")
        print(f"{'='*40}\n")
        return True

    # ── Production Email ──────────────────────────────────
    try:
        # Build the email
        message = MIMEMultipart("alternative")
        message["Subject"] = f"VoteSecure — Your Login Verification Code"
        message["From"]    = settings.SMTP_USER
        message["To"]      = recipient_email

        # Plain text version
        text_body = f"""
Dear {voter_name},

Your VoteSecure verification code is:

    {otp_code}

This code expires in 10 minutes.

If you did not request this code, please ignore this email
and contact your election administrator immediately.

— VoteSecure System
AI Professional College
        """

        # HTML version (shown in modern email clients)
        html_body = f"""
<html>
<body style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
    <div style="background: #0D2B55; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">VoteSecure</h2>
        <p style="color: #AACCEE; margin: 5px 0;">AI Professional College</p>
    </div>
    <div style="padding: 30px; background: #f9f9f9;">
        <p>Dear <strong>{voter_name}</strong>,</p>
        <p>Your verification code is:</p>
        <div style="text-align:center; margin: 25px 0;">
            <span style="font-size: 36px; font-weight: bold;
                         letter-spacing: 8px; color: #1565C0;
                         background: #EEF4FB; padding: 15px 25px;
                         border-radius: 8px;">
                {otp_code}
            </span>
        </div>
        <p style="color: #666;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #999; font-size: 12px;">
            If you did not request this code, please contact your
            election administrator immediately.
        </p>
    </div>
</body>
</html>
        """

        message.attach(MIMEText(text_body, "plain"))
        message.attach(MIMEText(html_body,  "html"))

        # Send via Gmail SMTP
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()                                    # Encrypt connection
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(
                settings.SMTP_USER,
                recipient_email,
                message.as_string(),
            )
        return True

    except Exception as e:
        print(f"❌ Email send failed: {e}")
        return False