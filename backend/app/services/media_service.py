import cloudinary.uploader

from ..extensions import db
from ..models import Media


def upload(file_storage) -> Media:
    result = cloudinary.uploader.upload(file_storage, folder="cvc")
    media = Media(
        cloudinary_public_id=result["public_id"],
        url=result["secure_url"],
        width=result.get("width"),
        height=result.get("height"),
        format=result.get("format"),
    )
    db.session.add(media)
    db.session.commit()
    return media
