"""Services = the CVC service ladder. Public read, admin write (admin comes in phase 2)."""
from flask import jsonify, request

from ..models.service import Service
from . import api_v1


@api_v1.get("/services")
def list_services():
    query = Service.query.filter_by(published=True)

    tier = request.args.get("tier", type=int)
    if tier is not None:
        query = query.filter_by(tier=tier)

    items = query.order_by(Service.tier, Service.sort_order).all()
    return jsonify(items=[s.to_dict() for s in items], count=len(items))


@api_v1.get("/services/<slug>")
def get_service(slug):
    service = Service.query.filter_by(slug=slug, published=True).first()
    if service is None:
        return jsonify(error="not_found", message="No such service"), 404
    return jsonify(service.to_dict())
