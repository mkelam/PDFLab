"""Email service for sending transactional emails via SMTP."""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Environment, FileSystemLoader, select_autoescape
from pathlib import Path
import structlog
import asyncio
from concurrent.futures import ThreadPoolExecutor

from app.config import settings

logger = structlog.get_logger(__name__)

# Thread pool for running sync SMTP in async context
executor = ThreadPoolExecutor(max_workers=3)

# Setup Jinja2 environment for email templates
template_dir = Path(__file__).parent.parent / "templates" / "emails"
template_dir.mkdir(parents=True, exist_ok=True)

jinja_env = Environment(
    loader=FileSystemLoader(str(template_dir)),
    autoescape=select_autoescape(['html', 'xml'])
)


def _send_email_sync(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str = None
) -> bool:
    """
    Synchronous email sending function (runs in thread pool).

    Uses standard smtplib which works reliably with Hostinger.
    """
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        message["To"] = to_email
        message["Subject"] = subject

        # Add plain text version if provided
        if text_content:
            message.attach(MIMEText(text_content, "plain"))

        # Add HTML version
        message.attach(MIMEText(html_content, "html"))

        # Send email via SMTP (using sync smtplib)
        if settings.SMTP_PORT == 465:
            # Port 465: Use SSL from the start
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        else:
            # Port 587: Connect then STARTTLS
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            server.starttls()

        # Login and send
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(message)
        server.quit()

        logger.info(
            "email_sent_successfully",
            to_email=to_email,
            subject=subject
        )
        return True

    except Exception as e:
        logger.error(
            "email_send_failed",
            to_email=to_email,
            subject=subject,
            error=str(e)
        )
        return False


async def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: str = None
) -> bool:
    """
    Send an email via SMTP (async wrapper around sync function).

    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML email body
        text_content: Plain text email body (optional)

    Returns:
        True if email sent successfully, False otherwise
    """
    # Run sync function in thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        executor,
        _send_email_sync,
        to_email,
        subject,
        html_content,
        text_content
    )


async def send_verification_email(
    to_email: str,
    user_name: str,
    verification_token: str
) -> bool:
    """
    Send email verification email to new user.

    Args:
        to_email: User's email address
        user_name: User's name
        verification_token: Email verification token

    Returns:
        True if email sent successfully
    """
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"

    # HTML content
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - PDFLab</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .logo {{
            text-align: center;
            margin-bottom: 30px;
        }}
        .logo h1 {{
            color: #6366f1;
            font-size: 32px;
            margin: 0;
        }}
        .button {{
            display: inline-block;
            padding: 14px 32px;
            background-color: #6366f1;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }}
        .button:hover {{
            background-color: #5558e3;
        }}
        .footer {{
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #999;
            font-size: 14px;
        }}
        .warning {{
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>PDFLab</h1>
        </div>

        <h2>Welcome to PDFLab, {user_name}!</h2>

        <p>Thank you for signing up. To complete your registration and start converting PDF files, please verify your email address by clicking the button below:</p>

        <div style="text-align: center;">
            <a href="{verification_url}" class="button">Verify Email Address</a>
        </div>

        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6366f1;">{verification_url}</p>

        <div class="warning">
            <strong>Note:</strong> This verification link will expire in 24 hours.
        </div>

        <p>If you didn't create an account with PDFLab, you can safely ignore this email.</p>

        <div class="footer">
            <p>&copy; 2025 PDFLab. All rights reserved.</p>
            <p>PDF conversion and manipulation made easy</p>
        </div>
    </div>
</body>
</html>
"""

    # Plain text version
    text_content = f"""
Welcome to PDFLab, {user_name}!

Thank you for signing up. To complete your registration and start converting PDF files, please verify your email address by clicking the link below:

{verification_url}

This verification link will expire in 24 hours.

If you didn't create an account with PDFLab, you can safely ignore this email.

---
PDFLab - PDF conversion and manipulation made easy
© 2025 PDFLab. All rights reserved.
"""

    return await send_email(
        to_email=to_email,
        subject="Verify Your Email - PDFLab",
        html_content=html_content,
        text_content=text_content
    )


async def send_password_reset_email(
    to_email: str,
    user_name: str,
    reset_token: str
) -> bool:
    """
    Send password reset email to user.

    Args:
        to_email: User's email address
        user_name: User's name
        reset_token: Password reset token

    Returns:
        True if email sent successfully
    """
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - PDFLab</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .logo {{
            text-align: center;
            margin-bottom: 30px;
        }}
        .logo h1 {{
            color: #6366f1;
            font-size: 32px;
            margin: 0;
        }}
        .button {{
            display: inline-block;
            padding: 14px 32px;
            background-color: #6366f1;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }}
        .footer {{
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #999;
            font-size: 14px;
        }}
        .warning {{
            background-color: #fee2e2;
            border-left: 4px solid #ef4444;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>PDFLab</h1>
        </div>

        <h2>Password Reset Request</h2>

        <p>Hello {user_name},</p>

        <p>We received a request to reset your password. Click the button below to choose a new password:</p>

        <div style="text-align: center;">
            <a href="{reset_url}" class="button">Reset Password</a>
        </div>

        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6366f1;">{reset_url}</p>

        <div class="warning">
            <strong>Security Note:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
        </div>

        <div class="footer">
            <p>&copy; 2025 PDFLab. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

    text_content = f"""
Password Reset Request

Hello {user_name},

We received a request to reset your password. Click the link below to choose a new password:

{reset_url}

This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.

---
PDFLab - PDF conversion and manipulation made easy
© 2025 PDFLab. All rights reserved.
"""

    return await send_email(
        to_email=to_email,
        subject="Reset Your Password - PDFLab",
        html_content=html_content,
        text_content=text_content
    )
