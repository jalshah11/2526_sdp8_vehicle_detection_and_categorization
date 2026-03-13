"""Async Gmail SMTP email sender — same concept as Node.js nodemailer SMTP transport.
Uses aiosmtplib with TLS/STARTTLS on port 587 (Gmail standard).
"""
from __future__ import annotations

import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

import aiosmtplib
from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)

GMAIL_USER = os.getenv("GMAIL_USER", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))


async def send_otp_email(to_email: str, otp: str, purpose: str) -> None:
    """Send a styled OTP email. purpose = 'verify' | 'reset'"""

    if purpose == "verify":
        subject = "Verify Your Email — Vehicle Analytics"
        heading = "Email Verification"
        body_text = "Use the OTP below to verify your email address."
        action_label = "This OTP is valid for 10 minutes."
    else:
        subject = "Password Reset OTP — Vehicle Analytics"
        heading = "Reset Your Password"
        body_text = "Use the OTP below to reset your account password."
        action_label = "This OTP is valid for 10 minutes. If you didn't request this, ignore this email."

    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
             style="background:#1e293b;border:1px solid #334155;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:32px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">🚗</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Vehicle Analytics</h1>
            <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">{heading}</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#94a3b8;font-size:15px;margin:0 0 24px;">{body_text}</p>
            <!-- OTP Box -->
            <div style="background:#0f172a;border:2px dashed #3b82f6;border-radius:12px;
                        padding:24px;text-align:center;margin-bottom:24px;">
              <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;
                         letter-spacing:2px;">Your OTP Code</p>
              <span style="font-size:42px;font-weight:800;letter-spacing:10px;color:#60a5fa;
                           font-family:'Courier New',monospace;">{otp}</span>
            </div>
            <p style="color:#64748b;font-size:13px;margin:0 0 4px;text-align:center;">{action_label}</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#0f172a;padding:20px 40px;text-align:center;">
            <p style="color:#475569;font-size:12px;margin:0;">
              © 2025 Vehicle Analytics — Do not reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Vehicle Analytics <{GMAIL_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(f"Your OTP is: {otp}. Valid for 10 minutes.", "plain"))
    msg.attach(MIMEText(html, "html"))

    await aiosmtplib.send(
        msg,
        hostname=SMTP_HOST,
        port=SMTP_PORT,
        username=GMAIL_USER,
        password=GMAIL_APP_PASSWORD,
        start_tls=True,      # STARTTLS on port 587 — same as nodemailer {auth: {user, pass}}
    )
