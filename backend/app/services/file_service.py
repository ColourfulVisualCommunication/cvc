"""Private file storage for client deliverables and brief assets — the
first genuinely private uploads in this app (portfolio/blog media, via
media_service.py, are always public marketing content). Every deliverable
lives in Cloudinary as type="authenticated" and is served only through a
signed, short-lived URL generated fresh per request — never a stored,
permanently-guessable secure_url like Media.url.
"""
import time

import cloudinary.utils
from flask import current_app

# Generated fresh per request, never persisted. Long enough for a page
# load's worth of images/download to actually complete, short enough that
# a leaked link is worthless within the hour.
URL_EXPIRY_SECONDS = 300


def signed_upload_signature(folder: str) -> dict:
    """For the direct-to-Cloudinary upload flow — the browser POSTs the
    file straight to Cloudinary using this, so the bytes never transit our
    own server. type="authenticated" is baked in here, not left to the
    client, so every deliverable/brief asset is private by construction.
    `folder` is always server-set (e.g. f"cvc/projects/{project_id}") —
    never client-supplied — since the upload-report verification step
    checks the reported public_id starts with exactly this prefix.
    """
    timestamp = int(time.time())
    params_to_sign = {"timestamp": timestamp, "folder": folder, "type": "authenticated"}
    signature = cloudinary.utils.api_sign_request(params_to_sign, current_app.config["CLOUDINARY_API_SECRET"])
    return {
        "signature": signature,
        "timestamp": timestamp,
        "api_key": current_app.config["CLOUDINARY_API_KEY"],
        "cloud_name": current_app.config["CLOUDINARY_CLOUD_NAME"],
        "folder": folder,
        "type": "authenticated",
    }


def verify_upload_report(public_id: str, version, signature: str) -> bool:
    """Confirms a browser's report of "I uploaded this" actually came from
    Cloudinary, not a forged request naming someone else's public_id —
    closes the cross-tenant file-leak this app would otherwise have.
    """
    return cloudinary.utils.verify_api_response_signature(public_id, version, signature)


def signed_view_url(public_id: str, resource_type: str) -> str:
    """Review-quality only — resized and compressed, good enough to judge
    the work, not good enough to ship. This is what keeps the ungated
    (pre-payment) review flow from silently being a free full-quality
    download; see signed_download_url for the real thing.
    """
    url, _ = cloudinary.utils.cloudinary_url(
        public_id,
        resource_type=resource_type,
        type="authenticated",
        sign_url=True,
        secure=True,
        transformation=[{"width": 1200, "crop": "limit", "quality": "auto:eco"}],
        expires_at=int(time.time()) + URL_EXPIRY_SECONDS,
    )
    return url


def signed_download_url(public_id: str, resource_type: str) -> str:
    """The original, untransformed asset — only ever call this from a
    route that has already checked project.is_fully_paid (or is the
    trusted admin path, which always has full access to its own work).
    """
    url, _ = cloudinary.utils.cloudinary_url(
        public_id,
        resource_type=resource_type,
        type="authenticated",
        sign_url=True,
        secure=True,
        expires_at=int(time.time()) + URL_EXPIRY_SECONDS,
    )
    return url
