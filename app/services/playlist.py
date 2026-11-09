"""Playlist queries, owner-authorized CRUD and cross-artist membership."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.models.artist import Artist
from app.models.playlist import Playlist
from app.models.playlist_track import PlaylistTrack
from app.models.track import Track
from app.models.user import User
from app.schemas.playlist import PlaylistCreate, PlaylistUpdate
from app.services.base import CRUDService
from app.services.playlist_track import playlist_track_service
from app.utils.crud import apply_updates, commit_and_refresh
from app.utils.pagination import DEFAULT_PAGE_SIZE, paginate


class PlaylistService(CRUDService[Playlist]):
    model = Playlist
    not_found_detail = "Playlist not found"
    order_by = Playlist.name.asc()

    # ------------------------------------------------------------------- read
    def list_by_owner(
        self,
        db: Session,
        owner_id: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[Playlist]:
        statement = (
            db.query(Playlist)
            .filter(Playlist.owner_id == owner_id)
            .order_by(Playlist.created_at.desc())
        )
        return paginate(statement, skip, limit)

    def list_system(
        self,
        db: Session,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[Playlist]:
        statement = (
            db.query(Playlist)
            .filter(Playlist.is_system.is_(True))
            .order_by(Playlist.name.asc())
        )
        return paginate(statement, skip, limit)

    def get_with_tracks(self, db: Session, playlist_id: str) -> Playlist:
        playlist = (
            db.query(Playlist)
            .options(
                selectinload(Playlist.entries).selectinload(PlaylistTrack.track)
            )
            .filter(Playlist.id == playlist_id)
            .first()
        )
        if playlist is None:
            return self.get_or_404(db, playlist_id)
        return playlist

    def artists(self, db: Session, playlist_id: str) -> list[Artist]:
        """Distinct artists represented in a playlist (one or many)."""
        self.get_or_404(db, playlist_id)
        return (
            db.query(Artist)
            .join(Track, Track.artist_id == Artist.id)
            .join(PlaylistTrack, PlaylistTrack.track_id == Track.id)
            .filter(PlaylistTrack.playlist_id == playlist_id)
            .distinct()
            .order_by(Artist.name.asc())
            .all()
        )

    # ------------------------------------------------------------------ write
    def create_for_owner(
        self,
        db: Session,
        user: User,
        payload: PlaylistCreate,
    ) -> Playlist:
        """Create a playlist owned by the caller (a user or an artist)."""
        data = payload.model_dump()
        data["owner_id"] = user.id
        data["is_system"] = False
        return self.create(db, data)

    def require_owner(
        self,
        db: Session,
        user: User,
        playlist_id: str,
    ) -> Playlist:
        playlist = self.get_or_404(db, playlist_id)
        if playlist.owner_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only manage your own playlists",
            )
        return playlist

    def update_for_owner(
        self,
        db: Session,
        user: User,
        playlist_id: str,
        payload: PlaylistUpdate,
    ) -> Playlist:
        playlist = self.require_owner(db, user, playlist_id)
        data = payload.model_dump(
            exclude_unset=True,
            exclude={"owner_id", "is_system"},
        )
        apply_updates(playlist, data)
        return commit_and_refresh(db, playlist)

    def delete_for_owner(
        self,
        db: Session,
        user: User,
        playlist_id: str,
    ) -> None:
        playlist = self.require_owner(db, user, playlist_id)
        db.delete(playlist)
        db.commit()

    def add_track(
        self,
        db: Session,
        user: User,
        playlist_id: str,
        track_id: str,
        position: int | None = None,
    ) -> PlaylistTrack:
        """Add any artist's track to an owned playlist."""
        self.require_owner(db, user, playlist_id)
        return playlist_track_service.add_track(
            db, playlist_id, track_id, position
        )

    def remove_track(
        self,
        db: Session,
        user: User,
        playlist_id: str,
        track_id: str,
    ) -> None:
        self.require_owner(db, user, playlist_id)
        playlist_track_service.remove_track(db, playlist_id, track_id)


playlist_service = PlaylistService()
