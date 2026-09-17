"""Clients — Phase 7's "client history view". Admin-only; there is no
public route (a Client row isn't reached by a signed link itself, only
the Retainers/Projects that belong to one are).

A Client is populated lazily (find-or-create by email — see
retainer_service._find_or_create_client), not backfilled from history, so
its FK-backed `retainers` relationship is only ever part of the picture.
The detail view below also surfaces Quotes/Projects matched by email at
query time, clearly labeled as such — Quote/Project were never
retrofitted with a client_id FK (see Client's own docstring for why).
"""
from flask import jsonify, request
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import Client, Quote
from . import api_v1


@api_v1.get("/admin/clients")
@jwt_required()
def admin_list_clients():
    items = Client.query.order_by(Client.created_at.desc()).all()
    return jsonify(items=[c.to_dict() for c in items], count=len(items))


@api_v1.get("/admin/clients/<int:client_id>")
@jwt_required()
def admin_get_client(client_id):
    client = db.session.get(Client, client_id)
    if client is None:
        return jsonify(error="not_found", message="No such client"), 404

    data = client.to_dict(include_retainers=True)
    matched_quotes = []
    if client.email:
        quotes = Quote.query.filter_by(client_email=client.email).order_by(Quote.created_at.desc()).all()
        matched_quotes = [
            {
                "quote_id": q.id,
                "title": q.title,
                "status": q.status,
                "project_id": q.project.id if q.project else None,
                "project_status": q.project.status if q.project else None,
                "created_at": q.created_at.isoformat() if q.created_at else None,
            }
            for q in quotes
        ]
    # Clearly labeled — computed by email match, not a real FK relationship.
    data["related_by_email"] = matched_quotes
    return jsonify(data)


@api_v1.post("/admin/clients")
@jwt_required()
def admin_create_client():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify(error="bad_request", message="name is required"), 400

    client = Client(
        name=name,
        email=(data.get("email") or "").strip() or None,
        phone=(data.get("phone") or "").strip() or None,
        notes=data.get("notes"),
    )
    db.session.add(client)
    db.session.commit()
    return jsonify(client.to_dict()), 201


@api_v1.patch("/admin/clients/<int:client_id>")
@jwt_required()
def admin_update_client(client_id):
    client = db.session.get(Client, client_id)
    if client is None:
        return jsonify(error="not_found", message="No such client"), 404

    data = request.get_json(silent=True) or {}
    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            return jsonify(error="bad_request", message="name cannot be blank"), 400
        client.name = name
    if "email" in data:
        client.email = (data["email"] or "").strip() or None
    if "phone" in data:
        client.phone = (data["phone"] or "").strip() or None
    if "notes" in data:
        client.notes = data["notes"]
    if "followup_opt_out" in data:
        client.followup_opt_out = bool(data["followup_opt_out"])

    db.session.commit()
    return jsonify(client.to_dict())
