"""Profile-picture storage records."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.profile_picture import ProfilePicture
from app.schemas.profile_picture import ProfilePictureCreate
from app.services.base import CRUDService
from app.utils.pagination import DEFAULT_PAGE_SIZE, paginate
from app.utils.storage import ensure_http_url, upload


class ProfilePictureService(CRUDService[ProfilePicture]):
    model = ProfilePicture
    not_found_detail = "Profile picture not found"
    order_by = ProfilePicture.created_at.desc()

    def list_for_user(
        self,
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[ProfilePicture]:
        statement = (
            db.query(ProfilePicture)
            .filter(ProfilePicture.user_id == user_id)
            .order_by(ProfilePicture.created_at.desc())
        )
        return paginate(statement, skip, limit)

    def latest_for_user(
        self,
        db: Session,
        user_id: str,
    ) -> ProfilePicture | None:
        return (
            db.query(ProfilePicture)
            .filter(ProfilePicture.user_id == user_id)
            .order_by(ProfilePicture.created_at.desc())
            .first()
        )

    def create_for_user(
        self,
        db: Session,
        user_id: str,
        image: str,
    ) -> ProfilePicture:
        if image:
            image = ensure_http_url(image, field="image_url")
        return self.create(
            db,
            ProfilePictureCreate(user_id=user_id, image=image),
        )

    def upload_for_user(
        self,
        db: Session,
        user_id: str,
        file,
    ) -> ProfilePicture:
        image_url = upload(file, kind="image", folder="npop/avatars")
        if not image_url:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Profile picture upload failed",
            )
        return self.create_for_user(db, user_id, image_url)


profile_picture_service = ProfilePictureService()
