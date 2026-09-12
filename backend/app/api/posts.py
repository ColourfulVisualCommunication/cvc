"""Blog posts. Public read (published only), admin write."""
from datetime import datetime, timezone

from flask import jsonify, request
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import Post
from . import api_v1


@api_v1.get("/posts")
def list_posts():
    items = (
        Post.query.filter_by(published=True)
        .order_by(Post.published_at.desc())
        .all()
    )
    return jsonify(items=[p.to_dict() for p in items], count=len(items))


@api_v1.get("/posts/<slug>")
def get_post(slug):
    post = Post.query.filter_by(slug=slug, published=True).first()
    if post is None:
        return jsonify(error="not_found", message="No such post"), 404
    return jsonify(post.to_dict())


@api_v1.get("/admin/posts")
@jwt_required()
def admin_list_posts():
    items = Post.query.order_by(Post.created_at.desc()).all()
    return jsonify(items=[p.to_dict() for p in items], count=len(items))


@api_v1.post("/admin/posts")
@jwt_required()
def admin_create_post():
    data = request.get_json(silent=True) or {}
    if not data.get("slug") or not data.get("title"):
        return jsonify(error="bad_request", message="slug and title are required"), 400
    if Post.query.filter_by(slug=data["slug"]).first():
        return jsonify(error="bad_request", message="That slug is already in use"), 400

    published = bool(data.get("published", False))
    post = Post(
        slug=data["slug"],
        title=data["title"],
        excerpt=data.get("excerpt"),
        body=data.get("body"),
        cover_image_url=data.get("cover_image_url"),
        published=published,
        published_at=datetime.now(timezone.utc) if published else None,
    )
    db.session.add(post)
    db.session.commit()
    return jsonify(post.to_dict()), 201


@api_v1.patch("/admin/posts/<int:post_id>")
@jwt_required()
def admin_update_post(post_id):
    post = db.session.get(Post, post_id)
    if post is None:
        return jsonify(error="not_found", message="No such post"), 404

    data = request.get_json(silent=True) or {}
    was_published = post.published
    for field in ("slug", "title", "excerpt", "body", "cover_image_url", "published"):
        if field in data:
            setattr(post, field, data[field])

    if post.published and not was_published:
        post.published_at = datetime.now(timezone.utc)

    db.session.commit()
    return jsonify(post.to_dict())


@api_v1.delete("/admin/posts/<int:post_id>")
@jwt_required()
def admin_delete_post(post_id):
    post = db.session.get(Post, post_id)
    if post is None:
        return jsonify(error="not_found", message="No such post"), 404
    db.session.delete(post)
    db.session.commit()
    return jsonify(message="Deleted")
