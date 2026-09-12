"""Portfolio projects. Public read (published only), admin write."""
from flask import jsonify, request
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import PortfolioProject
from . import api_v1


@api_v1.get("/portfolio")
def list_portfolio():
    items = (
        PortfolioProject.query.filter_by(published=True)
        .order_by(PortfolioProject.sort_order)
        .all()
    )
    return jsonify(items=[p.to_dict() for p in items], count=len(items))


@api_v1.get("/portfolio/<slug>")
def get_portfolio(slug):
    project = PortfolioProject.query.filter_by(slug=slug, published=True).first()
    if project is None:
        return jsonify(error="not_found", message="No such project"), 404
    return jsonify(project.to_dict())


@api_v1.get("/admin/portfolio")
@jwt_required()
def admin_list_portfolio():
    items = PortfolioProject.query.order_by(PortfolioProject.sort_order).all()
    return jsonify(items=[p.to_dict() for p in items], count=len(items))


@api_v1.post("/admin/portfolio")
@jwt_required()
def admin_create_portfolio():
    data = request.get_json(silent=True) or {}
    if not data.get("slug") or not data.get("title"):
        return jsonify(error="bad_request", message="slug and title are required"), 400
    if PortfolioProject.query.filter_by(slug=data["slug"]).first():
        return jsonify(error="bad_request", message="That slug is already in use"), 400

    project = PortfolioProject(
        slug=data["slug"],
        title=data["title"],
        client_name=data.get("client_name"),
        summary=data.get("summary"),
        problem=data.get("problem"),
        solution=data.get("solution"),
        result=data.get("result"),
        cover_image_url=data.get("cover_image_url"),
        gallery=data.get("gallery", []),
        tags=data.get("tags", []),
        published=bool(data.get("published", False)),
        sort_order=data.get("sort_order", 0),
    )
    db.session.add(project)
    db.session.commit()
    return jsonify(project.to_dict()), 201


@api_v1.patch("/admin/portfolio/<int:project_id>")
@jwt_required()
def admin_update_portfolio(project_id):
    project = db.session.get(PortfolioProject, project_id)
    if project is None:
        return jsonify(error="not_found", message="No such project"), 404

    data = request.get_json(silent=True) or {}
    for field in (
        "slug", "title", "client_name", "summary", "problem", "solution",
        "result", "cover_image_url", "gallery", "tags", "published", "sort_order",
    ):
        if field in data:
            setattr(project, field, data[field])

    db.session.commit()
    return jsonify(project.to_dict())


@api_v1.delete("/admin/portfolio/<int:project_id>")
@jwt_required()
def admin_delete_portfolio(project_id):
    project = db.session.get(PortfolioProject, project_id)
    if project is None:
        return jsonify(error="not_found", message="No such project"), 404
    db.session.delete(project)
    db.session.commit()
    return jsonify(message="Deleted")
