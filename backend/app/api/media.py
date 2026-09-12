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

    media = media_service.upload(file)
    return jsonify(media.to_dict()), 201
