"""Email log — Phase 7's audit trail for every send attempt across all
email functions, written from email_service._log_email. Read-only: rows
are never edited or created directly here.
"""
from flask import jsonify, request
from flask_jwt_extended import jwt_required

from ..models import EmailLog
from . import api_v1


@api_v1.get("/admin/email-log")
@jwt_required()
def admin_list_email_log():
    query = EmailLog.query
    category = request.args.get("category")
    if category:
        query = query.filter(EmailLog.category == category)
    to_email = request.args.get("to_email")
    if to_email:
        query = query.filter(EmailLog.to_email == to_email)

    items = query.order_by(EmailLog.created_at.desc()).limit(500).all()
    return jsonify(items=[e.to_dict() for e in items], count=len(items))
