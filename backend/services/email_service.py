# backend/services/email_service.py
# ============================================================
# Email delivery service for VoteSecure
# Used to send OTP codes to voters during login
# ============================================================

# ============================================================
# EMAIL SETUP INSTRUCTIONS
#
# OPTION A: Gmail (current - temporary)
#   1. Go to myaccount.google.com
#   2. Security > 2-Step Verification > enable it
#   3. Security > App Passwords
#   4. Select app: Mail, device: Windows Computer
#   5. Copy the 16-character password
#   6. In backend/.env set:
#        GMAIL_USER=votesecure.online@gmail.com
#        GMAIL_APP_PASSWORD=your_16_char_app_password
#
# OPTION B: Brevo SMTP (production - when domain is live)
#   1. Sign up at brevo.com
#   2. Settings > SMTP and API > SMTP tab
#   3. Copy host, port, login, password
#   4. In backend/.env set:
#        BREVO_SMTP_HOST=smtp-relay.brevo.com
#        BREVO_SMTP_PORT=587
#        BREVO_SMTP_LOGIN=your_brevo_login
#        BREVO_SMTP_PASSWORD=your_brevo_password
#        EMAIL_FROM_ADDRESS=noreply@votesecure.online
#
# Switching from Gmail to Brevo:
#   Just fill in the Brevo credentials. The code checks Brevo first.
# ============================================================

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings


def _shell(body: str) -> str:
    """
    Wraps inner HTML content with the shared VoteSecure header/footer.
    Every outbound email renders its own body through this so branding
    and the support contact footer only need to change in one place.
    """
    return f"""
<html>
<body style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
    <div style="background: #0D2B55; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">{settings.PLATFORM_NAME}</h2>
        <p style="color: #AACCEE; margin: 5px 0;">AI Professional College</p>
    </div>
    <div style="padding: 30px; background: #f9f9f9;">
        {body}
    </div>
    <div style="padding: 16px; text-align: center; color: #999; font-size: 11px;">
        VoteSecure · votesecure.online · {settings.SUPPORT_EMAIL}
    </div>
</body>
</html>
    """


def _send(to_email: str, to_name: str, subject: str, html: str, text: str) -> bool:
    """
    Shared send path for every outbound email.

    Provider priority:
      1. Brevo SMTP  - if BREVO_SMTP_PASSWORD is set
      2. Gmail SMTP  - if GMAIL_APP_PASSWORD is set (temporary primary
                       provider, using votesecure.online@gmail.com,
                       until the votesecure.online domain goes live on Brevo)
      3. Dev fallback - print to terminal, used when neither is configured
    """
    # Dev fallback
    if not settings.BREVO_SMTP_PASSWORD and not settings.GMAIL_APP_PASSWORD:
        print(f"\n{'='*50}")
        print(f"  [DEV EMAIL] To: {to_name} <{to_email}>")
        print(f"  Subject: {subject}")
        print(f"  {text[:200]}")
        print(f"{'='*50}\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>"
        msg["To"]      = f"{to_name} <{to_email}>"
        msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html,  "html"))

        if settings.BREVO_SMTP_PASSWORD:
            host     = settings.BREVO_SMTP_HOST
            port     = settings.BREVO_SMTP_PORT
            login    = settings.BREVO_SMTP_LOGIN
            password = settings.BREVO_SMTP_PASSWORD
        else:
            host     = "smtp.gmail.com"
            port     = 587
            login    = settings.GMAIL_USER
            password = settings.GMAIL_APP_PASSWORD

        with smtplib.SMTP(host, port) as s:
            s.starttls()
            s.login(login, password)
            s.sendmail(settings.EMAIL_FROM_ADDRESS, to_email, msg.as_string())

        print(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        print(f"Email failed: {e}")
        return False


def send_otp_email(recipient_email: str, voter_name: str, otp_code: str) -> bool:
    """
    Send a one-time password code to a voter's email address.

    Returns True if sent successfully, False if it failed.
    We never crash the login flow over an email failure -
    in development, we just print the OTP to the terminal.
    """
    subject = "VoteSecure - Your Login Verification Code"

    # Plain text version
    text_body = f"""
Dear {voter_name},

Your VoteSecure verification code is:

    {otp_code}

This code expires in 10 minutes.

If you did not request this code, please ignore this email
and contact your election administrator immediately.

- VoteSecure System
AI Professional College
    """

    # HTML version (shown in modern email clients)
    html_body = _shell(f"""
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
    """)

    return _send(recipient_email, voter_name, subject, html_body, text_body)


def send_admin_registration_confirmation(email: str, name: str, username: str, password: str, org_name: str, is_owner: bool) -> bool:
    """Confirm a new org admin's login credentials after signup/join."""
    subject = f"VoteSecure - Your Admin Account for {org_name}"
    role_label = "Owner Admin" if is_owner else "Admin"

    text_body = f"""
Dear {name},

Your {role_label} account for {org_name} has been created.

    Username: {username}
    Password: {password}

Please log in and keep these credentials safe.

- VoteSecure System
    """

    html_body = _shell(f"""
    <p>Dear <strong>{name}</strong>,</p>
    <p>Your <strong>{role_label}</strong> account for <strong>{org_name}</strong> has been created.</p>
    <table style="margin: 20px 0; font-size: 14px;">
        <tr><td style="color:#666; padding: 4px 12px 4px 0;">Username</td><td><strong>{username}</strong></td></tr>
        <tr><td style="color:#666; padding: 4px 12px 4px 0;">Password</td><td><strong>{password}</strong></td></tr>
    </table>
    <p style="color: #999; font-size: 12px;">Please keep these credentials safe and change your password after first login.</p>
    """)

    return _send(email, name, subject, html_body, text_body)


def send_invite_code(email: str, name: str, org_name: str, invite_code: str) -> bool:
    """Send the organisation invite code to the owner admin, for sharing with co-admins."""
    subject = f"VoteSecure - Invite Code for {org_name}"

    text_body = f"""
Dear {name},

Share this invite code with the other admins for {org_name}:

    {invite_code}

They will need it to join and activate your organisation.

- VoteSecure System
    """

    html_body = _shell(f"""
    <p>Dear <strong>{name}</strong>,</p>
    <p>Share this invite code with the other admins for <strong>{org_name}</strong>:</p>
    <div style="text-align:center; margin: 25px 0;">
        <span style="font-size: 28px; font-weight: bold;
                     letter-spacing: 4px; color: #1565C0;
                     background: #EEF4FB; padding: 15px 25px;
                     border-radius: 8px;">
            {invite_code}
        </span>
    </div>
    <p style="color: #666;">They will need this code to join and activate your organisation.</p>
    """)

    return _send(email, name, subject, html_body, text_body)


def send_org_activated(email: str, name: str, org_name: str, admin_count: int) -> bool:
    """Notify all admins once the organisation reaches the minimum admin count and goes active."""
    subject = f"VoteSecure - {org_name} is Now Active"

    text_body = f"""
Dear {name},

{org_name} now has {admin_count} registered admins and is active.

You can now log in and start setting up elections.

- VoteSecure System
    """

    html_body = _shell(f"""
    <p>Dear <strong>{name}</strong>,</p>
    <p><strong>{org_name}</strong> now has <strong>{admin_count}</strong> registered admins and is active.</p>
    <p style="color: #666;">You can now log in and start setting up elections.</p>
    """)

    return _send(email, name, subject, html_body, text_body)


def send_admin_otp(email: str, name: str, otp_code: str, org_name: str) -> bool:
    """Send a one-time login verification code to an org admin."""
    subject = "VoteSecure - Your Admin Login Verification Code"

    text_body = f"""
Dear {name},

Your VoteSecure admin verification code for {org_name} is:

    {otp_code}

This code expires in 10 minutes.

- VoteSecure System
    """

    html_body = _shell(f"""
    <p>Dear <strong>{name}</strong>,</p>
    <p>Your admin verification code for <strong>{org_name}</strong> is:</p>
    <div style="text-align:center; margin: 25px 0;">
        <span style="font-size: 36px; font-weight: bold;
                     letter-spacing: 8px; color: #1565C0;
                     background: #EEF4FB; padding: 15px 25px;
                     border-radius: 8px;">
            {otp_code}
        </span>
    </div>
    <p style="color: #666;">This code expires in <strong>10 minutes</strong>.</p>
    """)

    return _send(email, name, subject, html_body, text_body)


def notify_payment_received(org_name: str, admin_name: str, admin_email: str, plan_name: str, max_voters: int, price_usd: float, payment_reference: str, receipt_note: str = None) -> bool:
    """Notify platform staff that an org has submitted a payment receipt awaiting licence issuance."""
    subject = f"VoteSecure - Payment Receipt from {org_name}"

    text_body = f"""
Payment receipt submitted.

Organisation: {org_name}
Admin: {admin_name} <{admin_email}>
Plan: {plan_name} (max {max_voters} voters)
Amount: ${price_usd:.2f}
Reference: {payment_reference}
Note: {receipt_note or '-'}

Verify payment and generate a licence code via POST /api/licences/generate.
    """

    html_body = _shell(f"""
    <p>Payment receipt submitted for <strong>{org_name}</strong>.</p>
    <table style="margin: 20px 0; font-size: 14px;">
        <tr><td style="color:#666; padding: 4px 12px 4px 0;">Admin</td><td>{admin_name} &lt;{admin_email}&gt;</td></tr>
        <tr><td style="color:#666; padding: 4px 12px 4px 0;">Plan</td><td>{plan_name} (max {max_voters} voters)</td></tr>
        <tr><td style="color:#666; padding: 4px 12px 4px 0;">Amount</td><td>${price_usd:.2f}</td></tr>
        <tr><td style="color:#666; padding: 4px 12px 4px 0;">Reference</td><td>{payment_reference}</td></tr>
        <tr><td style="color:#666; padding: 4px 12px 4px 0;">Note</td><td>{receipt_note or '-'}</td></tr>
    </table>
    <p style="color: #666;">Verify payment and generate a licence code via <code>POST /api/licences/generate</code>.</p>
    """)

    return _send(settings.PAYMENT_RECEIPT_EMAIL, "VoteSecure Payments", subject, html_body, text_body)


def send_licence_code(email: str, name: str, org_name: str, licence_code: str, plan_name: str, max_voters: int) -> bool:
    """Send a newly generated licence code to the organisation's owner admin."""
    subject = f"VoteSecure - Your Licence Code for {org_name}"

    text_body = f"""
Dear {name},

Your licence for {org_name} has been issued.

    Plan: {plan_name} (max {max_voters} voters)
    Licence code: {licence_code}

Use this code in the admin dashboard to activate your election.

- VoteSecure System
    """

    html_body = _shell(f"""
    <p>Dear <strong>{name}</strong>,</p>
    <p>Your licence for <strong>{org_name}</strong> has been issued.</p>
    <p style="color: #666;">Plan: <strong>{plan_name}</strong> (max {max_voters} voters)</p>
    <div style="text-align:center; margin: 25px 0;">
        <span style="font-size: 28px; font-weight: bold;
                     letter-spacing: 4px; color: #1565C0;
                     background: #EEF4FB; padding: 15px 25px;
                     border-radius: 8px;">
            {licence_code}
        </span>
    </div>
    <p style="color: #666;">Use this code in the admin dashboard to activate your election.</p>
    """)

    return _send(email, name, subject, html_body, text_body)


def send_voter_otp(email: str, name: str, otp_code: str) -> bool:
    """Alias for send_otp_email — used by auth routers."""
    return send_otp_email(email, name, otp_code)


def send_password_reset_email(email: str, name: str, reset_url: str) -> bool:
    html = _shell(f"""
<p style="color:#374151;font-size:15px;margin:0 0 16px;">Dear <strong>{name}</strong>,</p>
<p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 24px;">
  We received a request to reset your VoteSecure admin password.
  Click the button below to set a new password.
</p>
<div style="text-align:center;margin:28px 0;">
  <a href="{reset_url}"
     style="background:#0D2B55;color:#ffffff;text-decoration:none;
            padding:14px 32px;border-radius:8px;font-weight:700;
            font-size:14px;display:inline-block;">
    Reset My Password
  </a>
</div>
<p style="color:#64748B;font-size:13px;margin:0 0 6px;">
  This link expires in <strong>1 hour</strong>.
</p>
<div style="background:#FEF3C7;border-left:4px solid #D97706;border-radius:6px;padding:12px 16px;margin-top:20px;">
  <p style="color:#92400E;font-size:13px;margin:0;">
    If you did not request a password reset, you can safely ignore this email.
    Your password will not change.
  </p>
</div>""")
    text = f"Dear {name},\n\nReset your VoteSecure password:\n{reset_url}\n\nExpires in 1 hour.\n\nIf you did not request this, ignore this email."
    return _send(email, name, "VoteSecure - Password Reset Request", html, text)


def send_approval_request_email(
    email: str, name: str, org_name: str,
    action_label: str, approve_url: str,
    initiated_by: str, expires_hours: int = 48,
) -> bool:
    html = _shell(f"""
<p style="color:#374151;font-size:15px;margin:0 0 16px;">Dear <strong>{name}</strong>,</p>
<p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 20px;">
  <strong>{initiated_by}</strong> has requested approval for a sensitive action
  in <strong>{org_name}</strong>. Your approval is required before this action
  can be executed.
</p>
<div style="background:#EEF4FB;border:1px solid #BFDBFE;border-radius:10px;padding:20px;margin-bottom:24px;">
  <p style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748B;margin:0 0 8px;">Action Requested</p>
  <p style="font-size:18px;font-weight:800;color:#0D2B55;margin:0;">{action_label}</p>
</div>
<div style="text-align:center;margin:28px 0;">
  <a href="{approve_url}"
     style="background:#0D2B55;color:#ffffff;text-decoration:none;
            padding:14px 32px;border-radius:8px;font-weight:700;
            font-size:14px;display:inline-block;">
    Review and Vote
  </a>
</div>
<p style="color:#64748B;font-size:13px;">
  This request expires in <strong>{expires_hours} hours</strong>.
  One rejection from any admin cancels the action entirely.
</p>""")
    text = f"Dear {name},\n\n{initiated_by} requested approval for: {action_label}\n\nReview at: {approve_url}\n\nExpires in {expires_hours} hours."
    return _send(email, name, f"VoteSecure - Approval Required: {action_label}", html, text)


def send_approval_result_email(
    email: str, name: str, org_name: str,
    action_label: str, approved: bool,
) -> bool:
    status_word = "Approved" if approved else "Rejected"
    bg_color    = "#DCFCE7" if approved else "#FEE2E2"
    text_color  = "#065F46" if approved else "#991B1B"
    html = _shell(f"""
<p style="color:#374151;font-size:15px;margin:0 0 16px;">Dear <strong>{name}</strong>,</p>
<div style="background:{bg_color};border-radius:10px;padding:20px;margin-bottom:20px;text-align:center;">
  <p style="font-size:22px;font-weight:800;color:{text_color};margin:0;">
    {status_word}: {action_label}
  </p>
</div>
<p style="color:#64748B;font-size:14px;line-height:1.6;">
  {"All admins approved this action. It has been executed." if approved else "An admin rejected this action. It has been cancelled."}
</p>""")
    text = f"Dear {name},\n\n{action_label} was {status_word.lower()} in {org_name}."
    return _send(email, name, f"VoteSecure - Action {status_word}: {action_label}", html, text)


def send_voter_invite_email(
    email: str, org_name: str,
    invite_url: str, invited_by: str,
) -> bool:
    html = _shell(f"""
<p style="color:#374151;font-size:15px;margin:0 0 16px;">Hello,</p>
<p style="color:#64748B;font-size:14px;line-height:1.6;margin:0 0 20px;">
  <strong>{invited_by}</strong> from <strong>{org_name}</strong> has invited you
  to register as a voter on VoteSecure. Click below to create your account.
</p>
<div style="text-align:center;margin:28px 0;">
  <a href="{invite_url}"
     style="background:#0D2B55;color:#ffffff;text-decoration:none;
            padding:14px 32px;border-radius:8px;font-weight:700;
            font-size:14px;display:inline-block;">
    Accept Invitation
  </a>
</div>
<p style="color:#64748B;font-size:13px;">
  This invitation expires in <strong>7 days</strong>.
  Your registration will require approval from organisation administrators
  before you can vote.
</p>""")
    text = f"Hello,\n\nYou have been invited to vote in {org_name}.\n\nRegister at: {invite_url}\n\nExpires in 7 days."
    return _send(email, org_name, f"You are invited to vote - {org_name}", html, text)