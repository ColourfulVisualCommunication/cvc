"""Leads. Public create (the "Start a project" form), admin read/update.

Spam protection is a honeypot only: the public form ships a hidden field
name real visitors never see or fill, and a bot that fills every field
trips it. No CAPTCHA, no new dependency — nothing else in this codebase
does spam protection yet, so this sets the simplest possible precedent.
A filled honeypot returns 201 with no lead actually created, so a bot
never learns its submission was rejected.
"""
from flask import jsonify, request
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import Lead
from ..models.lead import LEAD_STATUSES
from ..services import email_service
from . import api_v1


@api_v1.post("/leads")
def create_lead():
    data = request.get_json(silent=True) or {}

    # Honeypot: real visitors never see or fill this field.
    if data.get("company"):
        return jsonify(message="Thanks — we'll be in touch."), 201

    name = (data.get("name") or "").strip()
    project_description = (data.get("project_description") or "").strip()
    email = (data.get("email") or "").strip()
    phone = (data.get("phone") or "").strip()

    if not name or not project_description:
        return jsonify(error="bad_request", message="name and project_description are required"), 400
    if not email and not phone:
        return jsonify(error="bad_request", message="An email or phone number is required"), 400

    lead = Lead(
        name=name,
        email=email or None,
        phone=phone or None,
        project_description=project_description,
        budget=(data.get("budget") or "").strip() or None,
        deadline=(data.get("deadline") or "").strip() or None,
    )
    db.session.add(lead)
    db.session.commit()

    email_service.send_lead_notification(lead)
    email_service.send_lead_acknowledgement(lead)

    return jsonify(lead.to_dict()), 201


@api_v1.get("/admin/leads")
@jwt_required()
def admin_list_leads():
    items = Lead.query.order_by(Lead.created_at.desc()).all()
    return jsonify(items=[l.to_dict() for l in items], count=len(items))


@api_v1.patch("/admin/leads/<int:lead_id>")
@jwt_required()
def admin_update_lead(lead_id):
    lead = db.session.get(Lead, lead_id)
    if lead is None:
        return jsonify(error="not_found", message="No such lead"), 404

    data = request.get_json(silent=True) or {}
    if "status" in data:
        if data["status"] not in LEAD_STATUSES:
            return jsonify(error="bad_request", message=f"status must be one of {LEAD_STATUSES}"), 400
        lead.status = data["status"]

    db.session.commit()
    return jsonify(lead.to_dict())


@api_v1.delete("/admin/leads/<int:lead_id>")
@jwt_required()
def admin_delete_lead(lead_id):
    lead = db.session.get(Lead, lead_id)
    if lead is None:
        return jsonify(error="not_found", message="No such lead"), 404
    db.session.delete(lead)
    db.session.commit()
    return jsonify(message="Deleted")
