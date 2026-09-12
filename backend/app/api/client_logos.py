"""Client logos for the public 'clients we work with' strip. Public read
(published only), admin write."""
from flask import jsonify, request
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import ClientLogo
from . import api_v1


@api_v1.get("/client-logos")
def list_client_logos():
    items = (
        ClientLogo.query.filter_by(published=True)
        .order_by(ClientLogo.sort_order)
        .all()
    )
    return jsonify(items=[c.to_dict() for c in items], count=len(items))


@api_v1.get("/admin/client-logos")
@jwt_required()
def admin_list_client_logos():
    items = ClientLogo.query.order_by(ClientLogo.sort_order).all()
    return jsonify(items=[c.to_dict() for c in items], count=len(items))


@api_v1.post("/admin/client-logos")
@jwt_required()
def admin_create_client_logo():
    data = request.get_json(silent=True) or {}
    if not data.get("name") or not data.get("logo_url"):
        return jsonify(error="bad_request", message="name and logo_url are required"), 400

    logo = ClientLogo(
        name=data["name"],
        logo_url=data["logo_url"],
        published=bool(data.get("published", False)),
        sort_order=data.get("sort_order", 0),
    )
    db.session.add(logo)
    db.session.commit()
    return jsonify(logo.to_dict()), 201


@api_v1.patch("/admin/client-logos/<int:logo_id>")
@jwt_required()
def admin_update_client_logo(logo_id):
    logo = db.session.get(ClientLogo, logo_id)
    if logo is None:
        return jsonify(error="not_found", message="No such client logo"), 404

    data = request.get_json(silent=True) or {}
    for field in ("name", "logo_url", "published", "sort_order"):
        if field in data:
            setattr(logo, field, data[field])

    db.session.commit()
    return jsonify(logo.to_dict())


@api_v1.delete("/admin/client-logos/<int:logo_id>")
@jwt_required()
def admin_delete_client_logo(logo_id):
    logo = db.session.get(ClientLogo, logo_id)
    if logo is None:
        return jsonify(error="not_found", message="No such client logo"), 404
    db.session.delete(logo)
    db.session.commit()
    return jsonify(message="Deleted")
