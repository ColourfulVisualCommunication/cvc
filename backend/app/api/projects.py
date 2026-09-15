"""Projects. Created automatically the moment a deposit is paid (see
project_service.create_from_deposit_payment) — admin manages delivery,
the client reaches theirs through its own signed link, same pattern as
quotes (see token_service).
"""
from flask import jsonify, request
from flask_jwt_extended import jwt_required

from ..extensions import db
from ..models import Project, Deliverable
from ..services import file_service, invoice_service, project_service, token_service
from ..services.project_service import PROJECT_TOKEN_MAX_AGE_DAYS
from . import api_v1


def _load_project_by_token(token):
    project_id = token_service.verify(token, "project", PROJECT_TOKEN_MAX_AGE_DAYS)
    if project_id is None:
        return None
    return db.session.get(Project, project_id)


def _verified_upload_or_error(data, project_id):
    """Shared by both persist routes: confirms the browser's upload report
    actually came from Cloudinary (not a forged public_id naming someone
    else's file), and that it landed in this project's own folder.
    Returns (public_id, resource_type, format) on success, or (None, None, error_response).
    """
    public_id = data.get("public_id")
    version = data.get("version")
    signature = data.get("signature")
    resource_type = data.get("resource_type", "image")
    if not public_id or not version or not signature:
        return None, None, (jsonify(error="bad_request", message="public_id, version and signature are required"), 400)
    if not file_service.verify_upload_report(public_id, version, signature):
        return None, None, (jsonify(error="bad_request", message="Could not verify this upload"), 400)
    if not public_id.startswith(f"cvc/projects/{project_id}/"):
        return None, None, (jsonify(error="bad_request", message="Upload does not belong to this project"), 400)
    return public_id, resource_type, None


# ---- Admin --------------------------------------------------------------


@api_v1.get("/admin/projects")
@jwt_required()
def admin_list_projects():
    items = Project.query.order_by(Project.created_at.desc()).all()
    return jsonify(items=[p.to_dict() for p in items], count=len(items))


@api_v1.get("/admin/projects/<int:project_id>")
@jwt_required()
def admin_get_project(project_id):
    project = db.session.get(Project, project_id)
    if project is None:
        return jsonify(error="not_found", message="No such project"), 404
    return jsonify(project.to_dict(include_deliverables=True, include_approvals=True))


@api_v1.post("/admin/projects/<int:project_id>/deliverables")
@jwt_required()
def admin_add_deliverable(project_id):
    project = db.session.get(Project, project_id)
    if project is None:
        return jsonify(error="not_found", message="No such project"), 404

    data = request.get_json(silent=True) or {}
    public_id, resource_type, error = _verified_upload_or_error(data, project_id)
    if error:
        return error

    deliverable = project_service.add_deliverable(
        project,
        public_id=public_id,
        resource_type=resource_type,
        filename=data.get("filename"),
        file_format=data.get("format"),
    )
    return jsonify(deliverable.to_dict()), 201


@api_v1.post("/admin/projects/<int:project_id>/publish")
@jwt_required()
def admin_publish_project(project_id):
    project = db.session.get(Project, project_id)
    if project is None:
        return jsonify(error="not_found", message="No such project"), 404
    try:
        project_service.publish_for_approval(project)
    except ValueError as exc:
        return jsonify(error="bad_request", message=str(exc)), 400
    return jsonify(project.to_dict(include_deliverables=True))


@api_v1.get("/admin/projects/<int:project_id>/deliverables/<int:deliverable_id>/download")
@jwt_required()
def admin_download_deliverable(project_id, deliverable_id):
    # No payment gate — this is the studio's own work product.
    deliverable = db.session.get(Deliverable, deliverable_id)
    if deliverable is None or deliverable.project_id != project_id:
        return jsonify(error="not_found", message="No such deliverable"), 404
    url = file_service.signed_download_url(deliverable.public_id, deliverable.resource_type)
    return jsonify(url=url)


# ---- Public (signed project token, no login) -----------------------------


@api_v1.get("/projects/<token>")
def get_project(token):
    project = _load_project_by_token(token)
    if project is None:
        return jsonify(error="not_found", message="This project link isn't valid"), 404
    return jsonify(project.to_dict(include_deliverables=True, include_approvals=True))


@api_v1.post("/projects/<token>/brief")
def submit_brief(token):
    project = _load_project_by_token(token)
    if project is None:
        return jsonify(error="not_found", message="This project link isn't valid"), 404
    if project.status != "brief":
        return jsonify(error="bad_request", message="The brief has already been submitted"), 400

    data = request.get_json(silent=True) or {}
    brief_text = data.get("brief_text")
    if not brief_text:
        return jsonify(error="bad_request", message="brief_text is required"), 400

    project_service.submit_brief(project, brief_text)
    return jsonify(project.to_dict())


@api_v1.post("/projects/<token>/brief/assets")
def add_brief_asset(token):
    project = _load_project_by_token(token)
    if project is None:
        return jsonify(error="not_found", message="This project link isn't valid"), 404

    data = request.get_json(silent=True) or {}
    public_id, resource_type, error = _verified_upload_or_error(data, project.id)
    if error:
        return error

    try:
        project_service.add_brief_asset(project, public_id, resource_type, data.get("filename"))
    except ValueError as exc:
        return jsonify(error="bad_request", message=str(exc)), 400
    return jsonify(project.to_dict())


@api_v1.get("/projects/<token>/deliverables/<int:deliverable_id>/view")
def view_deliverable(token, deliverable_id):
    project = _load_project_by_token(token)
    if project is None:
        return jsonify(error="not_found", message="This project link isn't valid"), 404
    if project.status not in ("awaiting_approval", "complete"):
        return jsonify(error="bad_request", message="Nothing to review yet"), 400

    deliverable = db.session.get(Deliverable, deliverable_id)
    if deliverable is None or deliverable.project_id != project.id:
        return jsonify(error="not_found", message="No such deliverable"), 404

    # Review quality only — resized/compressed, not the original. See
    # file_service.signed_view_url for why this matters.
    url = file_service.signed_view_url(deliverable.public_id, deliverable.resource_type)
    return jsonify(url=url)


@api_v1.get("/projects/<token>/deliverables/<int:deliverable_id>/download")
def download_deliverable(token, deliverable_id):
    project = _load_project_by_token(token)
    if project is None:
        return jsonify(error="not_found", message="This project link isn't valid"), 404
    if not project.is_fully_paid:
        return jsonify(error="forbidden", message="Files unlock once the balance is paid"), 403

    deliverable = db.session.get(Deliverable, deliverable_id)
    if deliverable is None or deliverable.project_id != project.id:
        return jsonify(error="not_found", message="No such deliverable"), 404

    url = file_service.signed_download_url(deliverable.public_id, deliverable.resource_type)
    return jsonify(url=url)


@api_v1.post("/projects/<token>/approve")
def approve_project(token):
    project = _load_project_by_token(token)
    if project is None:
        return jsonify(error="not_found", message="This project link isn't valid"), 404
    if project.status != "awaiting_approval":
        return jsonify(error="bad_request", message="Nothing is awaiting approval"), 400

    project_service.approve(project)
    return jsonify(project.to_dict(include_deliverables=True, include_approvals=True))


@api_v1.post("/projects/<token>/request-changes")
def request_changes(token):
    project = _load_project_by_token(token)
    if project is None:
        return jsonify(error="not_found", message="This project link isn't valid"), 404
    if project.status != "awaiting_approval":
        return jsonify(error="bad_request", message="Nothing is awaiting approval"), 400

    data = request.get_json(silent=True) or {}
    note = data.get("note")
    try:
        project_service.request_changes(project, note)
    except ValueError as exc:
        return jsonify(error="bad_request", message=str(exc)), 400
    return jsonify(project.to_dict(include_deliverables=True, include_approvals=True))


@api_v1.post("/projects/<token>/pay")
def pay_project_balance(token):
    project = _load_project_by_token(token)
    if project is None:
        return jsonify(error="not_found", message="This project link isn't valid"), 404
    if project.is_fully_paid:
        return jsonify(error="bad_request", message="This project is already fully paid"), 400
    balance_invoice = project.quote.balance_invoice
    if balance_invoice is None:
        return jsonify(error="bad_request", message="There's no balance to pay yet"), 400

    data = request.get_json(silent=True) or {}
    phone_number = data.get("phone_number")
    if not phone_number:
        return jsonify(error="bad_request", message="phone_number is required"), 400

    payment, error = invoice_service.initiate_payment(balance_invoice, phone_number)
    if error:
        return jsonify(error="mpesa_error", message=error), 400
    return jsonify(payment.to_public_dict()), 202


@api_v1.get("/projects/<token>/payment-status")
def project_payment_status(token):
    project = _load_project_by_token(token)
    if project is None:
        return jsonify(error="not_found", message="This project link isn't valid"), 404
    balance_invoice = project.quote.balance_invoice
    if balance_invoice is None or not balance_invoice.payments:
        return jsonify(error="not_found", message="No payment attempt yet"), 404

    latest = balance_invoice.payments[0]  # ordered by created_at desc
    return jsonify(payment=latest.to_public_dict(), project=project.to_dict())
