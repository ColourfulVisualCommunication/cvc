"""Invoice and receipt PDFs. reportlab, not weasyprint — Render's standard
Python buildpack has no system Cairo/Pango, and reportlab ships as a
self-contained wheel with no system dependency to install.
"""
import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

CVC_ADDRESS = ["Colourful Visual Communication", "Ndeiya, Limuru, Kenya", "njoroge@colourfulvisualcommunication.com · +254 769 604255"]


def _kes(cents):
    return f"KES {cents / 100:,.2f}"


def _document(title):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()
    return buffer, doc, styles


def _header(styles, heading):
    story = [Paragraph("Colourful Visual Communication", styles["Title"])]
    for line in CVC_ADDRESS[1:]:
        story.append(Paragraph(line, styles["Normal"]))
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph(heading, styles["Heading1"]))
    return story


def _items_table(items):
    rows = [["Description", "Qty", "Unit price", "Amount"]]
    for item in items:
        rows.append([
            item.description,
            str(item.quantity),
            _kes(item.unit_price_cents),
            _kes(item.quantity * item.unit_price_cents),
        ])
    table = Table(rows, colWidths=[80 * mm, 20 * mm, 35 * mm, 35 * mm])
    table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#16181a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    return table


def _bill_to(invoice):
    """(name, title, items) for either an invoice's quote or its retainer
    — a retainer invoice has no QuoteItem rows, so it gets a single
    synthesized line instead. Both PDF functions below go through this
    rather than touching invoice.quote directly, which used to crash
    unconditionally on a retainer invoice (invoice.quote is None)."""
    if invoice.kind == "retainer":
        r = invoice.retainer
        line = type("Item", (), {
            "description": f"Monthly retainer — {r.plan_name}",
            "quantity": 1,
            "unit_price_cents": invoice.amount_cents,
        })
        return r.client.name, r.plan_name, [line]
    q = invoice.quote
    return q.client_name, q.title, q.items


def invoice_pdf_bytes(invoice) -> bytes:
    buffer, doc, styles = _document(invoice.number)
    client_name, title, items = _bill_to(invoice)
    story = _header(styles, f"Invoice {invoice.number}")
    story.append(Paragraph(f"Bill to: {client_name}", styles["Normal"]))
    story.append(Paragraph(f"For: {title}", styles["Normal"]))
    story.append(Spacer(1, 8 * mm))
    story.append(_items_table(items))
    story.append(Spacer(1, 8 * mm))
    if invoice.quote:
        story.append(Paragraph(f"Quote total: {_kes(invoice.quote.total_cents)}", styles["Normal"]))
    label = "Retainer due" if invoice.kind == "retainer" else "Deposit due"
    story.append(Paragraph(f"<b>{label}: {_kes(invoice.amount_cents)}</b>", styles["Normal"]))
    story.append(Paragraph(f"Status: {invoice.status.upper()}", styles["Normal"]))
    doc.build(story)
    return buffer.getvalue()


def receipt_pdf_bytes(invoice, payment) -> bytes:
    buffer, doc, styles = _document(f"Receipt for {invoice.number}")
    client_name, title, _items = _bill_to(invoice)
    reference = payment.provider_reference or payment.manual_reference or "—"
    story = _header(styles, f"Receipt — {invoice.number}")
    story.append(Paragraph("<b>PAID</b>", styles["Heading2"]))
    story.append(Paragraph(f"Received from: {client_name}", styles["Normal"]))
    story.append(Paragraph(f"For: {title}", styles["Normal"]))
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph(f"Amount paid: {_kes(payment.amount_cents)}", styles["Normal"]))
    story.append(Paragraph(f"Method: {'M-Pesa' if payment.method == 'mpesa' else 'Manual'}", styles["Normal"]))
    story.append(Paragraph(f"Reference: {reference}", styles["Normal"]))
    if payment.completed_at:
        story.append(Paragraph(f"Date: {payment.completed_at.strftime('%d %B %Y')}", styles["Normal"]))
    doc.build(story)
    return buffer.getvalue()
