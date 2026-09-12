"""Image upload. Admin only — every upload goes through Cloudinary and is
logged as a Media row (see app/services/media_service.py)."""
from flask import jsonify, request
from flask_jwt_extended import jwt_required

from ..services import media_service
from . import api_v1


@api_v1.post("/admin/media")
@jwt_required()
def upload_media():
    file = request.files.get("file")
    if file is None:
        return jsonify(error="bad_request", message="No file provided"), 400

    # Optional, comma-separated extension whitelist (e.g. "svg,png") — most
    # uploads (portfolio photos, avatars) accept anything Cloudinary handles,
    # but some content types (client logos) need to restrict format.
    formats = request.form.get("formats")
    if formats:
        allowed = {f.strip().lower() for f in formats.split(",") if f.strip()}
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in allowed:
            return jsonify(
                error="bad_request",
                message=f"Only {', '.join(sorted(allowed))} files are allowed",
            ), 400

    media = media_service.upload(file)
    return jsonify(media.to_dict()), 201
