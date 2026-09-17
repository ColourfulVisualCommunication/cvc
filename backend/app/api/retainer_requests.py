"""Retainer requests — the "retainer request log", shaped like Lead
(public create + honeypot, admin list/update): an enquiry, not yet a
contract. See RetainerRequest for the status lifecycle.
"""
from flask import jsonify, request
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import RetainerRequest, Service
from ..models.retainer_request import RETAINER_REQUEST_STATUSES
from ..services import email_service
from . import api_v1


@api_v1.post("/retainer-requests")
def create_retainer_request():
    data = request.get_json(silent=True) or {}

    # Honeypot: real visitors never see or fill this field.
    if data.get("company"):
        return jsonify(message="Thanks — we'll be in touch."), 201

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    phone = (data.get("phone") or "").strip()
    if not name:
        return jsonify(error="bad_request", message="name is required"), 400
    if not email and not phone:
        return jsonify(error="bad_request", message="An email or phone number is required"), 400

    service_id = data.get("service_id")
    service = db.session.get(Service, int(service_id)) if service_id else None

    request_row = RetainerRequest(
        name=name,
        email=email or None,
        phone=phone or None,
        service_id=service.id if service else None,
        message=(data.get("message") or "").strip() or None,
    )
    db.session.add(request_row)
    db.session.commit()

    email_service.send_retainer_request_notification(request_row)

    return jsonify(request_row.to_dict()), 201


@api_v1.get("/admin/retainer-requests")
@jwt_required()
def admin_list_retainer_requests():
    items = RetainerRequest.query.order_by(RetainerRequest.created_at.desc()).all()
    return jsonify(items=[r.to_dict() for r in items], count=len(items))


@api_v1.patch("/admin/retainer-requests/<int:request_id>")
@jwt_required()
def admin_update_retainer_request(request_id):
    request_row = db.session.get(RetainerRequest, request_id)
    if request_row is None:
        return jsonify(error="not_found", message="No such retainer request"), 404

    data = request.get_json(silent=True) or {}
    if "status" in data:
        if data["status"] not in RETAINER_REQUEST_STATUSES:
            return jsonify(error="bad_request", message=f"status must be one of {RETAINER_REQUEST_STATUSES}"), 400
        request_row.status = data["status"]

    db.session.commit()
    return jsonify(request_row.to_dict())


@api_v1.delete("/admin/retainer-requests/<int:request_id>")
@jwt_required()
def admin_delete_retainer_request(request_id):
    request_row = db.session.get(RetainerRequest, request_id)
    if request_row is None:
        return jsonify(error="not_found", message="No such retainer request"), 404
    db.session.delete(request_row)
    db.session.commit()
    return jsonify(message="Deleted")
