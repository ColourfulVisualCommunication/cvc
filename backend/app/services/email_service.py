"""Brevo transactional email — the six emails from CLAUDE.md, starting
here with the first: notifying Njoroge a lead came in, and acknowledging
the enquirer. Sent via Brevo's plain REST API (no SDK installed; this is
the only call site, so a dependency wasn't worth adding for it).

An email failing must never fail the transaction that triggered it
(CLAUDE.md) — every send here is wrapped so it logs and returns rather
than raising, and callers never need their own try/except around it.
"""
import logging

import requests
from flask import current_app

logger = logging.getLogger(__name__)

BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email"


def _send(to_email: str, to_name: str, subject: str, html_content: str) -> bool:
    api_key = current_app.config.get("BREVO_API_KEY")
    if not api_key:
        logger.warning("BREVO_API_KEY not set — skipping email %r to %s", subject, to_email)
        return False

    payload = {
        "sender": {
            "name": current_app.config["EMAIL_FROM_NAME"],
            "email": current_app.config["EMAIL_FROM"],
        },
        "to": [{"email": to_email, "name": to_name}],
        "subject": subject,
        "htmlContent": html_content,
    }
    try:
        response = requests.post(
            BREVO_ENDPOINT,
            json=payload,
            headers={"api-key": api_key, "content-type": "application/json"},
            timeout=10,
        )
        response.raise_for_status()
        return True
    except requests.RequestException:
        logger.exception("Failed to send email %r to %s", subject, to_email)
        return False


def send_lead_notification(lead) -> bool:
    """To Njoroge — a new lead just came in."""
    admin_email = current_app.config["EMAIL_FROM"]
    details = "".join(
        f"<p><strong>{label}:</strong> {value}</p>"
        for label, value in [
            ("Name", lead.name),
            ("Email", lead.email or "—"),
            ("Phone", lead.phone or "—"),
            ("Budget", lead.budget or "—"),
            ("Deadline", lead.deadline or "—"),
        ]
    )
    html = f"""
        <h2>New lead from the site</h2>
        {details}
        <p><strong>Project:</strong></p>
        <p>{lead.project_description}</p>
    """
    return _send(admin_email, "CVC Admin", f"New lead: {lead.name}", html)


def send_lead_acknowledgement(lead) -> bool:
    """To the enquirer — only sent if they gave an email address."""
    if not lead.email:
        return False
    html = f"""
        <p>Hi {lead.name},</p>
        <p>Thanks for reaching out to Colourful Visual Communication — we've received
        your project details and will be in touch shortly, usually on WhatsApp.</p>
        <p>— CVC</p>
    """
    return _send(lead.email, lead.name, "We got your project details", html)
