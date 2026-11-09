"""Tracks pinned to a user's public profile."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.profile_track import ProfileTrack
from app.models.track import Track
from app.services.base import CRUDService
from app.utils.pagination import DEFAULT_PAGE_SIZE, paginate


class ProfileTrackService(CRUDService[ProfileTrack]):
    model = ProfileTrack
    not_found_detail = "Profile track not found"
    order_by = ProfileTrack.position.asc()

    def list_for_user(
        self,
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[ProfileTrack]:
        statement = (
            db.query(ProfileTrack)
            .options(joinedload(ProfileTrack.track))
            .filter(ProfileTrack.user_id == user_id)
            .order_by(ProfileTrack.position.asc())
        )
        return paginate(statement, skip, limit)

    def add(
        self,
        db: Session,
        user_id: str,
        track_id: str,
        position: int | None = None,
    ) -> ProfileTrack:
        if db.get(Track, track_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Track not found",
            )

        existing = (
            db.query(ProfileTrack)
            .filter(
                ProfileTrack.user_id == user_id,
                ProfileTrack.track_id == track_id,
            )
            .first()
        )
        if existing is not None:
            return existing

        if position is None:
            highest = (
                db.query(func.max(ProfileTrack.position))
                .filter(ProfileTrack.user_id == user_id)
                .scalar()
            )
            position = (highest or 0) + 1

        return self._create_entry(db, user_id, track_id, position)

    def _create_entry(
        self,
        db: Session,
        user_id: str,
        track_id: str,
        position: int,
    ) -> ProfileTrack:
        entry = ProfileTrack(
            user_id=user_id,
            track_id=track_id,
            position=position,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry

    def remove(self, db: Session, user_id: str, track_id: str) -> None:
        entry = (
            db.query(ProfileTrack)
            .filter(
                ProfileTrack.user_id == user_id,
                ProfileTrack.track_id == track_id,
            )
            .first()
        )
        if entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=self.not_found_detail,
            )
        db.delete(entry)
        db.commit()

    def reorder(
        self,
        db: Session,
        user_id: str,
        ordered_track_ids: list[str],
    ) -> list[ProfileTrack]:
        entries = {
            entry.track_id: entry
            for entry in db.query(ProfileTrack)
            .filter(ProfileTrack.user_id == user_id)
            .all()
        }

        missing = [track_id for track_id in ordered_track_ids if track_id not in entries]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tracks not on profile: {missing}",
            )

        for position, track_id in enumerate(ordered_track_ids, start=1):
            entries[track_id].position = position

        db.commit()
        return self.list_for_user(db, user_id, limit=len(entries))


profile_track_service = ProfileTrackService()
