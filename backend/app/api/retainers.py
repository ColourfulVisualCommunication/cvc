"""Retainers — Phase 7's standing monthly billing arrangements. Admin
creates/manages them; the client reaches their current retainer invoice
via its own signed link (token kind "retainer", same no-passwords
mechanism as quotes/projects — see token_service). Unlike a quote or
project, nothing auto-emails this link to the client: a "your retainer
invoice is ready" email isn't one of CLAUDE.md's six. The admin detail
view surfaces the link for Njoroge to send over WhatsApp instead (rule 5).
"""
import io
from datetime import date

from flask import jsonify, request, send_file
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import Client, Retainer, Service
from ..models.retainer import RETAINER_STATUSES
from ..models.service import utcnow
from ..services import invoice_service, pdf_service, retainer_service, token_service
from . import api_v1

# A retainer is a standing relationship with no natural end date, unlike a
# quote/project's own bounded lifecycle — long-lived rather than
# unbounded, so a compromised link can still eventually be rotated by
# re-issuing one (admin_get_retainer re-issues a fresh one every time).
RETAINER_TOKEN_MAX_AGE_DAYS = 3650


def _load_retainer_by_token(token):
    retainer_id = token_service.verify(token, "retainer", RETAINER_TOKEN_MAX_AGE_DAYS)
    if retainer_id is None:
        return None
    return db.session.get(Retainer, retainer_id)


# ---- Admin ------------------------------------------------------------


@api_v1.get("/admin/retainers")
@jwt_required()
def admin_list_retainers():
    items = Retainer.query.order_by(Retainer.created_at.desc()).all()
    return jsonify(items=[r.to_dict() for r in items], count=len(items))


@api_v1.get("/admin/retainers/<int:retainer_id>")
@jwt_required()
def admin_get_retainer(retainer_id):
    retainer = db.session.get(Retainer, retainer_id)
    if retainer is None:
        return jsonify(error="not_found", message="No such retainer"), 404
    data = retainer.to_dict(include_invoices=True)
    data["client_link_token"] = token_service.issue("retainer", retainer.id)
    return jsonify(data)


@api_v1.post("/admin/retainers")
@jwt_required()
def admin_create_retainer():
    data = request.get_json(silent=True) or {}

    client_id = data.get("client_id")
    client_name = (data.get("client_name") or "").strip()
    if client_id:
        client = db.session.get(Client, int(client_id))
        if client is None:
            return jsonify(error="bad_request", message="No such client"), 400
    elif client_name:
        client = retainer_service._find_or_create_client(
            client_name,
            (data.get("client_email") or "").strip() or None,
            (data.get("client_phone") or "").strip() or None,
        )
    else:
        return jsonify(error="bad_request", message="client_id or client_name is required"), 400

    service_id = data.get("service_id")
    service = db.session.get(Service, int(service_id)) if service_id else None
    if service is None:
        return jsonify(error="bad_request", message="A valid service_id is required"), 400

    monthly_amount_cents = data.get("monthly_amount_cents")
    if not monthly_amount_cents or int(monthly_amount_cents) <= 0:
        return jsonify(error="bad_request", message="monthly_amount_cents is required and must be positive"), 400

    try:
        billing_day = int(data.get("billing_day"))
    except (TypeError, ValueError):
        billing_day = None
    if not billing_day or not (1 <= billing_day <= 28):
        return jsonify(error="bad_request", message="billing_day must be an integer from 1 to 28"), 400

    started = date.today()
    next_invoice_date = data.get("next_invoice_date")
    next_invoice_date = date.fromisoformat(next_invoice_date) if next_invoice_date else started

    retainer = Retainer(
        client_id=client.id,
        service_id=service.id,
        plan_name=(data.get("plan_name") or "").strip() or service.name,
        monthly_amount_cents=int(monthly_amount_cents),
        billing_day=billing_day,
        next_invoice_date=next_invoice_date,
        started_at=started,
        notes=data.get("notes"),
    )
    db.session.add(retainer)
    db.session.commit()
    return jsonify(retainer.to_dict()), 201


@api_v1.patch("/admin/retainers/<int:retainer_id>")
@jwt_required()
def admin_update_retainer(retainer_id):
    retainer = db.session.get(Retainer, retainer_id)
    if retainer is None:
        return jsonify(error="not_found", message="No such retainer"), 404

    data = request.get_json(silent=True) or {}
    if "status" in data:
        if data["status"] not in RETAINER_STATUSES:
            return jsonify(error="bad_request", message=f"status must be one of {RETAINER_STATUSES}"), 400
        retainer.status = data["status"]
        if data["status"] == "cancelled" and retainer.cancelled_at is None:
            retainer.cancelled_at = utcnow()
    if "monthly_amount_cents" in data:
        amount = data["monthly_amount_cents"]
        if not amount or int(amount) <= 0:
            return jsonify(error="bad_request", message="monthly_amount_cents must be positive"), 400
        retainer.monthly_amount_cents = int(amount)
    if "billing_day" in data:
        try:
            day = int(data["billing_day"])
        except (TypeError, ValueError):
            day = None
        if not day or not (1 <= day <= 28):
            return jsonify(error="bad_request", message="billing_day must be an integer from 1 to 28"), 400
        retainer.billing_day = day
    if "next_invoice_date" in data:
        retainer.next_invoice_date = date.fromisoformat(data["next_invoice_date"])
    if "notes" in data:
        retainer.notes = data["notes"]

    db.session.commit()
    return jsonify(retainer.to_dict())


@api_v1.delete("/admin/retainers/<int:retainer_id>")
@jwt_required()
def admin_delete_retainer(retainer_id):
    retainer = db.session.get(Retainer, retainer_id)
    if retainer is None:
        return jsonify(error="not_found", message="No such retainer"), 404
    if retainer.invoices:
        return (
            jsonify(
                error="bad_request",
                message="This retainer has billing history — cancel it via status instead of deleting",
            ),
            400,
        )
    db.session.delete(retainer)
    db.session.commit()
    return jsonify(message="Deleted")


@api_v1.post("/admin/retainers/<int:retainer_id>/generate-now")
@jwt_required()
def admin_generate_retainer_invoice(retainer_id):
    retainer = db.session.get(Retainer, retainer_id)
    if retainer is None:
        return jsonify(error="not_found", message="No such retainer"), 404
    invoice = retainer_service.generate_invoice_now(retainer)
    if invoice is None:
        return jsonify(error="bad_request", message="This retainer already has a pending invoice"), 400
    return jsonify(invoice.to_dict()), 201


# ---- Public (signed retainer token, no login) --------------------------


@api_v1.get("/retainers/<token>")
def get_retainer(token):
    retainer = _load_retainer_by_token(token)
    if retainer is None:
        return jsonify(error="not_found", message="This retainer link isn't valid"), 404
    return jsonify(retainer.to_dict(include_invoices=True))


@api_v1.post("/retainers/<token>/pay")
def pay_retainer_invoice(token):
    retainer = _load_retainer_by_token(token)
    if retainer is None:
        return jsonify(error="not_found", message="This retainer link isn't valid"), 404

    invoice = next((i for i in retainer.invoices if i.status == "pending"), None)
    if invoice is None:
        return jsonify(error="bad_request", message="There's no pending retainer invoice to pay"), 400

    data = request.get_json(silent=True) or {}
    phone_number = data.get("phone_number")
    if not phone_number:
        return jsonify(error="bad_request", message="phone_number is required"), 400

    payment, error = invoice_service.initiate_payment(invoice, phone_number)
    if error:
        return jsonify(error="mpesa_error", message=error), 400
    return jsonify(payment.to_public_dict()), 202


@api_v1.get("/retainers/<token>/payment-status")
def retainer_payment_status(token):
    retainer = _load_retainer_by_token(token)
    if retainer is None:
        return jsonify(error="not_found", message="This retainer link isn't valid"), 404

    invoice = next((i for i in retainer.invoices if i.payments), None)
    if invoice is None:
        return jsonify(error="not_found", message="No payment attempt yet"), 404

    latest = invoice.payments[0]  # ordered by created_at desc
    return jsonify(payment=latest.to_public_dict(), invoice=invoice.to_public_dict())


@api_v1.get("/retainers/<token>/receipt.pdf")
def retainer_receipt_pdf(token):
    retainer = _load_retainer_by_token(token)
    if retainer is None:
        return jsonify(error="not_found", message="This retainer link isn't valid"), 404

    invoice = next((i for i in retainer.invoices if i.status == "paid"), None)
    if invoice is None:
        return jsonify(error="bad_request", message="No paid invoice to receipt yet"), 400

    payment = next((p for p in invoice.payments if p.status == "success"), None)
    pdf_bytes = pdf_service.receipt_pdf_bytes(invoice, payment)
    return send_file(
        io.BytesIO(pdf_bytes), mimetype="application/pdf", download_name=f"{invoice.number}-receipt.pdf"
    )
