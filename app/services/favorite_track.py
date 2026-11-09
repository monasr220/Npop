"""Favourite tracks: add, remove and list."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.favorite_track import FavoriteTrack
from app.models.track import Track
from app.services.base import CRUDService
from app.utils.crud import commit_and_refresh
from app.utils.pagination import DEFAULT_PAGE_SIZE, paginate


class FavoriteTrackService(CRUDService[FavoriteTrack]):
    model = FavoriteTrack
    not_found_detail = "Favourite track not found"
    order_by = FavoriteTrack.created_at.desc()

    def list_for_user(
        self,
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[FavoriteTrack]:
        statement = (
            db.query(FavoriteTrack)
            .options(joinedload(FavoriteTrack.track))
            .filter(FavoriteTrack.user_id == user_id)
            .order_by(FavoriteTrack.created_at.desc())
        )
        return paginate(statement, skip, limit)

    def is_favorite(self, db: Session, user_id: str, track_id: str) -> bool:
        return (
            db.query(FavoriteTrack)
            .filter(
                FavoriteTrack.user_id == user_id,
                FavoriteTrack.track_id == track_id,
            )
            .first()
            is not None
        )

    def add(self, db: Session, user_id: str, track_id: str) -> FavoriteTrack:
        if db.get(Track, track_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Track not found",
            )

        existing = (
            db.query(FavoriteTrack)
            .filter(
                FavoriteTrack.user_id == user_id,
                FavoriteTrack.track_id == track_id,
            )
            .first()
        )
        if existing is not None:
            return existing

        favorite = FavoriteTrack(user_id=user_id, track_id=track_id)
        db.add(favorite)
        return commit_and_refresh(db, favorite)

    def remove(self, db: Session, user_id: str, track_id: str) -> None:
        favorite = (
            db.query(FavoriteTrack)
            .filter(
                FavoriteTrack.user_id == user_id,
                FavoriteTrack.track_id == track_id,
            )
            .first()
        )
        if favorite is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=self.not_found_detail,
            )
        db.delete(favorite)
        db.commit()

    def count_for_track(self, db: Session, track_id: str) -> int:
        return (
            db.query(FavoriteTrack)
            .filter(FavoriteTrack.track_id == track_id)
            .count()
        )


favorite_track_service = FavoriteTrackService()
