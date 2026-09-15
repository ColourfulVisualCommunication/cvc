"""Brevo transactional email — the six emails from CLAUDE.md, starting
here with the first: notifying Njoroge a lead came in, and acknowledging
the enquirer. Sent via Brevo's plain REST API (no SDK installed; this is
the only call site, so a dependency wasn't worth adding for it).

An email failing must never fail the transaction that triggered it
(CLAUDE.md) — every send here is wrapped so it logs and returns rather
than raising, and callers never need their own try/except around it.
"""
import base64
import logging

import requests
from flask import current_app

logger = logging.getLogger(__name__)

BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email"


def _send(to_email: str, to_name: str, subject: str, html_content: str, attachments: list = None) -> bool:
    """attachments: optional list of (filename, bytes) tuples — used for the
    PDF receipt on send_payment_received. Every other caller omits it.
    """
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
    if attachments:
        payload["attachment"] = [
            {"name": filename, "content": base64.b64encode(content).decode()} for filename, content in attachments
        ]
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


def _quote_link(token: str) -> str:
    return f"{current_app.config['FRONTEND_URL'].rstrip('/')}/quote/{token}"


def send_quote_notification(quote, token: str) -> bool:
    """To the client — a quote's ready for them to look at (the "quote
    sent" email from CLAUDE.md's list of six)."""
    if not quote.client_email:
        return False
    deposit = quote.deposit_cents / 100
    html = f"""
        <p>Hi {quote.client_name},</p>
        <p>Here's your quote for <strong>{quote.title}</strong>:</p>
        <p><a href="{_quote_link(token)}">View and respond to your quote</a></p>
        <p>A deposit of KES {deposit:,.0f} ({quote.deposit_percentage}%) gets things started.</p>
        <p>— CVC</p>
    """
    return _send(quote.client_email, quote.client_name, f"Your quote: {quote.title}", html)


def send_quote_reminder(quote, token: str) -> bool:
    """To the client — one nudge if a sent quote hasn't been decided on."""
    if not quote.client_email:
        return False
    html = f"""
        <p>Hi {quote.client_name},</p>
        <p>Just a nudge on the quote we sent for <strong>{quote.title}</strong> —
        it's still open if you'd like to take a look.</p>
        <p><a href="{_quote_link(token)}">View and respond to your quote</a></p>
        <p>— CVC</p>
    """
    return _send(quote.client_email, quote.client_name, f"Reminder: your quote for {quote.title}", html)


def send_payment_received(invoice, payment) -> bool:
    """To the client — the deposit landed (the "payment received" email
    from CLAUDE.md's list of six). Receipt PDF attached; imported here
    rather than at module scope so a pdf_service import failure can never
    take down lead/quote emails that don't need it.
    """
    from . import pdf_service

    quote = invoice.quote
    if not quote.client_email:
        return False
    html = f"""
        <p>Hi {quote.client_name},</p>
        <p>We've received your deposit of KES {payment.amount_cents / 100:,.0f} for
        <strong>{quote.title}</strong>. Receipt attached — thank you.</p>
        <p>We'll be in touch shortly to get started.</p>
        <p>— CVC</p>
    """
    receipt = pdf_service.receipt_pdf_bytes(invoice, payment)
    return _send(
        quote.client_email,
        quote.client_name,
        f"Payment received: {quote.title}",
        html,
        attachments=[(f"{invoice.number}-receipt.pdf", receipt)],
    )
