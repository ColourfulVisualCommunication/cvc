"""Signature generation for direct-to-Cloudinary uploads — the browser
POSTs the file straight to Cloudinary using what these routes return, so
file bytes never transit our own server. See file_service.py for why
type="authenticated" is baked in here rather than left to the client.
"""
from flask import jsonify, request
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import Project
from ..services import file_service, token_service
from ..services.project_service import PROJECT_TOKEN_MAX_AGE_DAYS
from . import api_v1


@api_v1.post("/admin/uploads/sign")
@jwt_required()
def admin_upload_sign():
    """Admin uploading a deliverable. project_id is required so the folder
    (and thus the upload-report prefix check) is scoped per-project."""
    data = request.get_json(silent=True) or {}
    project_id = data.get("project_id")
    if not project_id:
        return jsonify(error="bad_request", message="project_id is required"), 400
    if db.session.get(Project, project_id) is None:
        return jsonify(error="not_found", message="No such project"), 404

    return jsonify(file_service.signed_upload_signature(folder=f"cvc/projects/{project_id}"))


@api_v1.post("/projects/<token>/uploads/sign")
def project_upload_sign(token):
    """Client uploading a brief reference asset — only while the brief is
    still open, matching project_service.add_brief_asset's own guard."""
    project_id = token_service.verify(token, "project", PROJECT_TOKEN_MAX_AGE_DAYS)
    if project_id is None:
        return jsonify(error="not_found", message="This project link isn't valid"), 404
    project = db.session.get(Project, project_id)
    if project is None:
        return jsonify(error="not_found", message="This project link isn't valid"), 404
    if project.status != "brief":
        return jsonify(error="bad_request", message="The brief has already been submitted"), 400

    return jsonify(file_service.signed_upload_signature(folder=f"cvc/projects/{project_id}"))
