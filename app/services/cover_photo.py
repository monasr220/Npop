"""Cover-photo storage records."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.cover_photo import CoverPhoto
from app.schemas.cover_photo import CoverPhotoCreate
from app.services.base import CRUDService
from app.utils.pagination import DEFAULT_PAGE_SIZE, paginate
from app.utils.storage import upload


class CoverPhotoService(CRUDService[CoverPhoto]):
    model = CoverPhoto
    not_found_detail = "Cover photo not found"
    order_by = CoverPhoto.created_at.desc()

    def list_for_user(
        self,
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[CoverPhoto]:
        statement = (
            db.query(CoverPhoto)
            .filter(CoverPhoto.user_id == user_id)
            .order_by(CoverPhoto.created_at.desc())
        )
        return paginate(statement, skip, limit)

    def latest_for_user(self, db: Session, user_id: str) -> CoverPhoto | None:
        return (
            db.query(CoverPhoto)
            .filter(CoverPhoto.user_id == user_id)
            .order_by(CoverPhoto.created_at.desc())
            .first()
        )

    def create_for_user(
        self,
        db: Session,
        user_id: str,
        image: str,
    ) -> CoverPhoto:
        return self.create(
            db,
            CoverPhotoCreate(user_id=user_id, image=image),
        )

    def upload_for_user(self, db: Session, user_id: str, file) -> CoverPhoto:
        image_url = upload(file)
        if not image_url:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Cover photo upload failed",
            )
        return self.create_for_user(db, user_id, image_url)


cover_photo_service = CoverPhotoService()
