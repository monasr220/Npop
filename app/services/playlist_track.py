"""Playlist membership: add, remove, reorder and list tracks."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.playlist import Playlist
from app.models.playlist_track import PlaylistTrack
from app.models.track import Track
from app.schemas.playlist_track import PlaylistTrackCreate
from app.services.base import CRUDService
from app.utils.pagination import DEFAULT_PAGE_SIZE, paginate


class PlaylistTrackService(CRUDService[PlaylistTrack]):
    model = PlaylistTrack
    not_found_detail = "Playlist track not found"
    order_by = PlaylistTrack.position.asc()

    def list_for_playlist(
        self,
        db: Session,
        playlist_id: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[PlaylistTrack]:
        statement = (
            db.query(PlaylistTrack)
            .options(joinedload(PlaylistTrack.track))
            .filter(PlaylistTrack.playlist_id == playlist_id)
            .order_by(PlaylistTrack.position.asc())
        )
        return paginate(statement, skip, limit)

    def add_track(
        self,
        db: Session,
        playlist_id: str,
        track_id: str,
        position: int | None = None,
    ) -> PlaylistTrack:
        if db.get(Playlist, playlist_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playlist not found",
            )
        if db.get(Track, track_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Track not found",
            )

        duplicate = (
            db.query(PlaylistTrack)
            .filter(
                PlaylistTrack.playlist_id == playlist_id,
                PlaylistTrack.track_id == track_id,
            )
            .first()
        )
        if duplicate is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Track is already in this playlist",
            )

        if position is None:
            highest = (
                db.query(func.max(PlaylistTrack.position))
                .filter(PlaylistTrack.playlist_id == playlist_id)
                .scalar()
            )
            position = (highest or 0) + 1

        return self.create(
            db,
            PlaylistTrackCreate(
                playlist_id=playlist_id,
                track_id=track_id,
                position=position,
            ),
        )

    def remove_track(
        self,
        db: Session,
        playlist_id: str,
        track_id: str,
    ) -> None:
        entry = (
            db.query(PlaylistTrack)
            .filter(
                PlaylistTrack.playlist_id == playlist_id,
                PlaylistTrack.track_id == track_id,
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
        playlist_id: str,
        ordered_track_ids: list[str],
    ) -> list[PlaylistTrack]:
        entries = {
            entry.track_id: entry
            for entry in db.query(PlaylistTrack)
            .filter(PlaylistTrack.playlist_id == playlist_id)
            .all()
        }

        missing = [track_id for track_id in ordered_track_ids if track_id not in entries]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tracks not in playlist: {missing}",
            )

        for position, track_id in enumerate(ordered_track_ids, start=1):
            entries[track_id].position = position

        db.commit()
        return self.list_for_playlist(db, playlist_id, limit=len(entries))

    def get_with_track(self, db: Session, entry_id: str) -> PlaylistTrack:
        entry = (
            db.query(PlaylistTrack)
            .options(joinedload(PlaylistTrack.track))
            .filter(PlaylistTrack.id == entry_id)
            .first()
        )
        if entry is None:
            return self.get_or_404(db, entry_id)
        return entry


playlist_track_service = PlaylistTrackService()
