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


def _log_email(to_email, to_name, subject, category, client_id, status):
    """The single place EmailLog rows get written — from _send, never
    per-caller. Wrapped in its own try/except so a logging-table hiccup
    can never take down the email send it's logging, same discipline as
    _send itself never failing the caller's transaction.
    """
    try:
        from ..extensions import db
        from ..models.email_log import EmailLog

        db.session.add(
            EmailLog(
                to_email=to_email,
                to_name=to_name,
                subject=subject,
                category=category,
                status=status,
                client_id=client_id,
            )
        )
        db.session.commit()
    except Exception:
        logger.exception("Failed to write EmailLog for %r to %s", subject, to_email)
        try:
            from ..extensions import db

            db.session.rollback()
        except Exception:
            pass


def _send(
    to_email: str,
    to_name: str,
    subject: str,
    html_content: str,
    attachments: list = None,
    category: str = None,
    client_id: int = None,
) -> bool:
    """attachments: optional list of (filename, bytes) tuples — used for the
    PDF receipt on send_payment_received. Every other caller omits it.
    category/client_id: tagging for EmailLog (see _log_email) — client_id
    is only passed where the caller happens to know it.
    """
    api_key = current_app.config.get("BREVO_API_KEY")
    if not api_key:
        logger.warning("BREVO_API_KEY not set — skipping email %r to %s", subject, to_email)
        _log_email(to_email, to_name, subject, category, client_id, status="skipped")
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
        _log_email(to_email, to_name, subject, category, client_id, status="sent")
        return True
    except requests.RequestException:
        logger.exception("Failed to send email %r to %s", subject, to_email)
        _log_email(to_email, to_name, subject, category, client_id, status="failed")
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
    return _send(admin_email, "CVC Admin", f"New lead: {lead.name}", html, category="lead_notification")


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
    return _send(lead.email, lead.name, "We got your project details", html, category="lead_acknowledgement")


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
    return _send(
        quote.client_email, quote.client_name, f"Your quote: {quote.title}", html, category="quote_sent"
    )


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
    return _send(
        quote.client_email,
        quote.client_name,
        f"Reminder: your quote for {quote.title}",
        html,
        category="quote_reminder",
    )


def send_payment_received(invoice, payment) -> bool:
    """To the client — a payment landed (the "payment received" email from
    CLAUDE.md's list of six — one email, kind-aware copy, not two). Receipt
    PDF attached; pdf_service imported here rather than at module scope so
    a pdf_service import failure can never take down lead/quote emails
    that don't need it.
    """
    from . import pdf_service

    if invoice.kind == "retainer":
        retainer = invoice.retainer
        client = retainer.client
        if not client or not client.email:
            return False
        client_email, client_name, client_id = client.email, client.name, client.id
        title = retainer.plan_name
        body = f"""
            <p>We've received your retainer payment of KES {payment.amount_cents / 100:,.0f} for
            <strong>{title}</strong>. Receipt attached — thank you.</p>
        """
    else:
        quote = invoice.quote
        if not quote.client_email:
            return False
        client_email, client_name, client_id = quote.client_email, quote.client_name, None
        title = quote.title
        if invoice.kind == "balance":
            body = f"""
                <p>We've received your final payment of KES {payment.amount_cents / 100:,.0f} for
                <strong>{title}</strong>. Receipt attached — thank you.</p>
                <p>Your files are ready to download.</p>
            """
        else:
            body = f"""
                <p>We've received your deposit of KES {payment.amount_cents / 100:,.0f} for
                <strong>{title}</strong>. Receipt attached — thank you.</p>
                <p>We'll be in touch shortly to get started.</p>
            """

    html = f"<p>Hi {client_name},</p>{body}<p>— CVC</p>"
    receipt = pdf_service.receipt_pdf_bytes(invoice, payment)
    return _send(
        client_email,
        client_name,
        f"Payment received: {title}",
        html,
        attachments=[(f"{invoice.number}-receipt.pdf", receipt)],
        category="payment_received",
        client_id=client_id,
    )


def _project_link(token: str) -> str:
    return f"{current_app.config['FRONTEND_URL'].rstrip('/')}/project/{token}"


def send_brief_needed(project, token: str) -> bool:
    """To the client — the deposit landed, the project exists, we need
    their brief (the "brief needed" email from CLAUDE.md's list of six)."""
    quote = project.quote
    if not quote.client_email:
        return False
    html = f"""
        <p>Hi {quote.client_name},</p>
        <p>Thanks for the deposit — <strong>{quote.title}</strong> is officially underway.</p>
        <p>Before we start, tell us a bit more about what you're after, and
        share any existing files (logo, brand guide, photos) that'll help:</p>
        <p><a href="{_project_link(token)}">Fill in your brief</a></p>
        <p>— CVC</p>
    """
    return _send(
        quote.client_email, quote.client_name, f"Tell us about {quote.title}", html, category="brief_needed"
    )


def send_ready_for_approval(project, token: str) -> bool:
    """To the client — a round of deliverables is up for review (the
    "ready for your approval" email from CLAUDE.md's list of six)."""
    quote = project.quote
    if not quote.client_email:
        return False
    html = f"""
        <p>Hi {quote.client_name},</p>
        <p>The first look at <strong>{quote.title}</strong> is ready for you to review.</p>
        <p><a href="{_project_link(token)}">View and respond</a></p>
        <p>— CVC</p>
    """
    return _send(
        quote.client_email,
        quote.client_name,
        f"Ready for your review: {quote.title}",
        html,
        category="ready_for_approval",
    )


def send_files_ready(project, token: str) -> bool:
    """To the client — the balance cleared, final files unlocked (the
    "files ready" email from CLAUDE.md's list of six)."""
    quote = project.quote
    if not quote.client_email:
        return False
    html = f"""
        <p>Hi {quote.client_name},</p>
        <p><strong>{quote.title}</strong> is done, and your final files are ready to download.</p>
        <p><a href="{_project_link(token)}">Download your files</a></p>
        <p>— CVC</p>
    """
    return _send(
        quote.client_email, quote.client_name, f"Your files are ready: {quote.title}", html, category="files_ready"
    )


def send_project_followup(project, token: str) -> bool:
    """To the client — six weeks after completion (the "what's next" /
    post-project follow-up email, sixth and final of CLAUDE.md's six).
    A review request and a soft retainer mention are folded into this one
    email, not a 7th — see the Phase 7 build plan's six-email-cap note.
    """
    quote = project.quote
    if not quote or not quote.client_email:
        return False
    review_url = current_app.config.get("GOOGLE_REVIEW_URL")
    review_block = (
        f'<p>If you have a minute, a <a href="{review_url}">quick review</a> helps other people find us.</p>'
        if review_url
        else ""
    )
    html = f"""
        <p>Hi {quote.client_name},</p>
        <p>It's been a few weeks since <strong>{quote.title}</strong> wrapped up — hope it's
        working well for you.</p>
        {review_block}
        <p>If anything ever needs updating, or you'd like ongoing support (we run monthly
        retainer plans for exactly that), just reply on WhatsApp — happy to help.</p>
        <p>— CVC</p>
    """
    return _send(
        quote.client_email,
        quote.client_name,
        f"How's {quote.title} going?",
        html,
        category="project_followup",
    )


def send_retainer_request_notification(request) -> bool:
    """To Njoroge only — a retainer enquiry came in. Deliberately no
    client-facing acknowledgement: a retainer enquiry is exactly the
    WhatsApp-first, relationship-driven conversation CLAUDE.md's rule 5
    already commits to; Njoroge follows up personally. Same non-counted
    class as send_lead_notification (admin-only, not one of the six).
    """
    admin_email = current_app.config["EMAIL_FROM"]
    details = "".join(
        f"<p><strong>{label}:</strong> {value}</p>"
        for label, value in [
            ("Name", request.name),
            ("Email", request.email or "—"),
            ("Phone", request.phone or "—"),
            ("Plan asked about", request.service.name if request.service else "—"),
        ]
    )
    html = f"""
        <h2>New retainer request</h2>
        {details}
        <p><strong>Message:</strong></p>
        <p>{request.message or "—"}</p>
    """
    return _send(
        admin_email,
        "CVC Admin",
        f"New retainer request: {request.name}",
        html,
        category="retainer_request_notification",
    )
