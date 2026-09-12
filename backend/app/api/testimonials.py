"""Testimonials. Public read (published only), admin write."""
from flask import jsonify, request
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import Testimonial
from . import api_v1


@api_v1.get("/testimonials")
def list_testimonials():
    items = (
        Testimonial.query.filter_by(published=True)
        .order_by(Testimonial.sort_order)
        .all()
    )
    return jsonify(items=[t.to_dict() for t in items], count=len(items))


@api_v1.get("/admin/testimonials")
@jwt_required()
def admin_list_testimonials():
    items = Testimonial.query.order_by(Testimonial.sort_order).all()
    return jsonify(items=[t.to_dict() for t in items], count=len(items))


@api_v1.post("/admin/testimonials")
@jwt_required()
def admin_create_testimonial():
    data = request.get_json(silent=True) or {}
    if not data.get("client_name") or not data.get("quote"):
        return jsonify(error="bad_request", message="client_name and quote are required"), 400

    testimonial = Testimonial(
        client_name=data["client_name"],
        client_role=data.get("client_role"),
        quote=data["quote"],
        avatar_url=data.get("avatar_url"),
        published=bool(data.get("published", False)),
        sort_order=data.get("sort_order", 0),
    )
    db.session.add(testimonial)
    db.session.commit()
    return jsonify(testimonial.to_dict()), 201


@api_v1.patch("/admin/testimonials/<int:testimonial_id>")
@jwt_required()
def admin_update_testimonial(testimonial_id):
    testimonial = db.session.get(Testimonial, testimonial_id)
    if testimonial is None:
        return jsonify(error="not_found", message="No such testimonial"), 404

    data = request.get_json(silent=True) or {}
    for field in ("client_name", "client_role", "quote", "avatar_url", "published", "sort_order"):
        if field in data:
            setattr(testimonial, field, data[field])

    db.session.commit()
    return jsonify(testimonial.to_dict())


@api_v1.delete("/admin/testimonials/<int:testimonial_id>")
@jwt_required()
def admin_delete_testimonial(testimonial_id):
    testimonial = db.session.get(Testimonial, testimonial_id)
    if testimonial is None:
        return jsonify(error="not_found", message="No such testimonial"), 404
    db.session.delete(testimonial)
    db.session.commit()
    return jsonify(message="Deleted")
