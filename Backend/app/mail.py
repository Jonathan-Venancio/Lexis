import smtplib
from email.message import EmailMessage

from app.config import get_settings


def send_email(to: str, subject: str, body: str) -> None:
    settings = get_settings()
    if not settings.smtp_configured:
        raise RuntimeError("SMTP is not configured")
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.mail_from
    message["To"] = to
    message.set_content(body)
    if settings.smtp_port == 465:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
            smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(message)
        return
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
        smtp.starttls()
        smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(message)
