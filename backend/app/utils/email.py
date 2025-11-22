import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config.settings import settings
from typing import Optional


async def send_email(
    to_email: str,
    subject: str,
    body: str,
    html_body: Optional[str] = None
) -> bool:
    """
    Send email using SMTP

    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Plain text email body
        html_body: Optional HTML email body

    Returns:
        True if email sent successfully, False otherwise
    """
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
        message["To"] = to_email
        message["Subject"] = subject

        # Add plain text part
        text_part = MIMEText(body, "plain")
        message.attach(text_part)

        # Add HTML part if provided
        if html_body:
            html_part = MIMEText(html_body, "html")
            message.attach(html_part)

        # Connect to SMTP server and send email
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)

        return True

    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False


async def send_verification_email(email: str, verification_link: str) -> bool:
    """
    Send email verification email

    Args:
        email: User email address
        verification_link: Email verification link

    Returns:
        True if email sent successfully
    """
    subject = "Verify your SehatGuru account"

    body = f"""
    Welcome to SehatGuru!

    Please verify your email address by clicking the link below:

    {verification_link}

    This link will expire in 24 hours.

    If you didn't create an account with SehatGuru, please ignore this email.

    Best regards,
    The SehatGuru Team
    """

    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4CAF50;">Welcome to SehatGuru!</h2>
            <p>Please verify your email address by clicking the button below:</p>
            <div style="margin: 30px 0;">
                <a href="{verification_link}"
                   style="background-color: #4CAF50; color: white; padding: 12px 24px;
                          text-decoration: none; border-radius: 4px; display: inline-block;">
                    Verify Email Address
                </a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="color: #666; word-break: break-all;">{verification_link}</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
                This link will expire in 24 hours.
            </p>
            <p style="color: #999; font-size: 12px;">
                If you didn't create an account with SehatGuru, please ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
                Best regards,<br>
                The SehatGuru Team
            </p>
        </body>
    </html>
    """

    return await send_email(email, subject, body, html_body)


async def send_password_reset_email(email: str, reset_link: str) -> bool:
    """
    Send password reset email

    Args:
        email: User email address
        reset_link: Password reset link

    Returns:
        True if email sent successfully
    """
    subject = "Reset your SehatGuru password"

    body = f"""
    Hello,

    We received a request to reset your password for your SehatGuru account.

    Click the link below to reset your password:

    {reset_link}

    This link will expire in 1 hour.

    If you didn't request a password reset, please ignore this email and your password will remain unchanged.

    Best regards,
    The SehatGuru Team
    """

    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4CAF50;">Password Reset Request</h2>
            <p>We received a request to reset your password for your SehatGuru account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="margin: 30px 0;">
                <a href="{reset_link}"
                   style="background-color: #4CAF50; color: white; padding: 12px 24px;
                          text-decoration: none; border-radius: 4px; display: inline-block;">
                    Reset Password
                </a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="color: #666; word-break: break-all;">{reset_link}</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
                This link will expire in 1 hour.
            </p>
            <p style="color: #999; font-size: 12px;">
                If you didn't request a password reset, please ignore this email and your password will remain unchanged.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
                Best regards,<br>
                The SehatGuru Team
            </p>
        </body>
    </html>
    """

    return await send_email(email, subject, body, html_body)
