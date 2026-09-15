"""Quotes. Admin builds them; the client reaches theirs via a signed link,
never a login (CLAUDE.md rule 4) — see token_service for how that link is
signed and verified.
"""
from datetime import date, datetime, timezone

from flask import jsonify, request
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import Quote, QuoteItem
from ..models.quote import QUOTE_STATUSES
from ..services import email_service, token_service
from . import api_v1

TOKEN_MAX_AGE_DAYS = 180


def _apply_items(quote, items_data):
    quote.items.clear()
    for i, item in enumerate(items_data or []):
        quote.items.append(
            QuoteItem(
                description=item["description"],
                quantity=int(item.get("quantity", 1)),
                unit_price_cents=int(item["unit_price_cents"]),
                sort_order=i,
            )
        )


def _parse_date(value):
    if not value:
        return None
    return date.fromisoformat(value)


# ---- Admin ----------------------------------------------------------------


@api_v1.get("/admin/quotes")
@jwt_required()
def admin_list_quotes():
    items = Quote.query.order_by(Quote.created_at.desc()).all()
    return jsonify(items=[q.to_dict(include_items=False) for q in items], count=len(items))


@api_v1.get("/admin/quotes/<int:quote_id>")
@jwt_required()
def admin_get_quote(quote_id):
    quote = db.session.get(Quote, quote_id)
    if quote is None:
        return jsonify(error="not_found", message="No such quote"), 404
    return jsonify(quote.to_dict())


@api_v1.post("/admin/quotes")
@jwt_required()
def admin_create_quote():
    data = request.get_json(silent=True) or {}
    if not data.get("client_name") or not data.get("title"):
        return jsonify(error="bad_request", message="client_name and title are required"), 400
    if not data.get("items"):
        return jsonify(error="bad_request", message="At least one line item is required"), 400

    quote = Quote(
        lead_id=data.get("lead_id"),
        client_name=data["client_name"],
        client_email=data.get("client_email"),
        client_phone=data.get("client_phone"),
        title=data["title"],
        notes=data.get("notes"),
        deposit_percentage=int(data.get("deposit_percentage", 50)),
        expires_at=_parse_date(data.get("expires_at")),
    )
    _apply_items(quote, data["items"])
    db.session.add(quote)
    db.session.commit()
    return jsonify(quote.to_dict()), 201


@api_v1.patch("/admin/quotes/<int:quote_id>")
@jwt_required()
def admin_update_quote(quote_id):
    quote = db.session.get(Quote, quote_id)
    if quote is None:
        return jsonify(error="not_found", message="No such quote"), 404

    data = request.get_json(silent=True) or {}
    for field in ("client_name", "client_email", "client_phone", "title", "notes", "deposit_percentage", "lead_id"):
        if field in data:
            setattr(quote, field, data[field])
    if "expires_at" in data:
        quote.expires_at = _parse_date(data["expires_at"])
    if "items" in data:
        _apply_items(quote, data["items"])

    db.session.commit()
    return jsonify(quote.to_dict())


@api_v1.delete("/admin/quotes/<int:quote_id>")
@jwt_required()
def admin_delete_quote(quote_id):
    quote = db.session.get(Quote, quote_id)
    if quote is None:
        return jsonify(error="not_found", message="No such quote"), 404
    db.session.delete(quote)
    db.session.commit()
    return jsonify(message="Deleted")


@api_v1.post("/admin/quotes/<int:quote_id>/send")
@jwt_required()
def admin_send_quote(quote_id):
    quote = db.session.get(Quote, quote_id)
    if quote is None:
        return jsonify(error="not_found", message="No such quote"), 404
    if not quote.items:
        return jsonify(error="bad_request", message="Add at least one line item before sending"), 400
    if not quote.client_email:
        return jsonify(error="bad_request", message="Add a client email before sending — needed to notify them"), 400

    token = token_service.issue("quote", quote.id)

    quote.status = "sent"
    quote.sent_at = datetime.now(timezone.utc)
    db.session.commit()

    email_service.send_quote_notification(quote, token)

    # The token, not a full URL — the frontend knows its own origin and
    # the /quote/:token route, and this is also what the admin copies to
    # paste into WhatsApp, which is how quotes actually get delivered
    # most of the time (CLAUDE.md rule 5: WhatsApp stays).
    return jsonify({**quote.to_dict(), "token": token})


@api_v1.post("/admin/quotes/<int:quote_id>/remind")
@jwt_required()
def admin_remind_quote(quote_id):
    quote = db.session.get(Quote, quote_id)
    if quote is None:
        return jsonify(error="not_found", message="No such quote"), 404
    if quote.status not in ("sent", "viewed"):
        return jsonify(error="bad_request", message="Only a sent, undecided quote can get a reminder"), 400
    if quote.reminder_sent_at is not None:
        return jsonify(error="bad_request", message="A reminder has already been sent for this quote"), 400

    token = token_service.issue("quote", quote.id)
    quote.reminder_sent_at = datetime.now(timezone.utc)
    db.session.commit()

    email_service.send_quote_reminder(quote, token)

    return jsonify(quote.to_dict())


# ---- Public (signed token, no login) ---------------------------------------


def _load_quote_by_token(token):
    quote_id = token_service.verify(token, "quote", TOKEN_MAX_AGE_DAYS)
    if quote_id is None:
        return None
    return db.session.get(Quote, quote_id)


def _expire_if_due(quote):
    if quote.expires_at and quote.status in ("sent", "viewed") and date.today() > quote.expires_at:
        quote.status = "expired"
        db.session.commit()


@api_v1.get("/quotes/<token>")
def get_quote(token):
    quote = _load_quote_by_token(token)
    if quote is None:
        return jsonify(error="not_found", message="This quote link isn't valid"), 404

    _expire_if_due(quote)

    if quote.viewed_at is None:
        quote.viewed_at = datetime.now(timezone.utc)
        if quote.status == "sent":
            quote.status = "viewed"
        db.session.commit()

    return jsonify(quote.to_dict())


@api_v1.post("/quotes/<token>/accept")
def accept_quote(token):
    quote = _load_quote_by_token(token)
    if quote is None:
        return jsonify(error="not_found", message="This quote link isn't valid"), 404

    _expire_if_due(quote)
    if quote.status not in ("sent", "viewed"):
        return jsonify(error="bad_request", message=f"This quote can't be accepted (status: {quote.status})"), 400

    quote.status = "accepted"
    quote.accepted_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(quote.to_dict())


@api_v1.post("/quotes/<token>/decline")
def decline_quote(token):
    quote = _load_quote_by_token(token)
    if quote is None:
        return jsonify(error="not_found", message="This quote link isn't valid"), 404

    _expire_if_due(quote)
    if quote.status not in ("sent", "viewed"):
        return jsonify(error="bad_request", message=f"This quote can't be declined (status: {quote.status})"), 400

    quote.status = "declined"
    quote.declined_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(quote.to_dict())
