"""Track queries, artist uploads, listening and play counts."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.track import Track
from app.models.user import User
from app.schemas.track import TrackCreate, TrackUpdate
from app.services.album import album_service
from app.services.artist import artist_service
from app.services.base import CRUDService
from app.services.playlist_history import play_history_service
from app.utils.crud import apply_updates, commit_and_refresh
from app.utils.pagination import DEFAULT_PAGE_SIZE, paginate
from app.utils.storage import ensure_http_url, upload


class TrackService(CRUDService[Track]):
    model = Track
    not_found_detail = "Track not found"
    order_by = Track.title.asc()

    # ------------------------------------------------------------------- read
    def list_by_album(
        self,
        db: Session,
        album_id: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[Track]:
        statement = (
            db.query(Track)
            .filter(Track.album_id == album_id)
            .order_by(Track.track_number.asc())
        )
        return paginate(statement, skip, limit)

    def list_by_artist(
        self,
        db: Session,
        artist_id: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[Track]:
        statement = (
            db.query(Track)
            .filter(Track.artist_id == artist_id)
            .order_by(Track.title.asc())
        )
        return paginate(statement, skip, limit)

    def search(
        self,
        db: Session,
        query: str,
        skip: int = 0,
        limit: int = DEFAULT_PAGE_SIZE,
    ) -> list[Track]:
        statement = (
            db.query(Track)
            .filter(Track.title.ilike(f"%{query}%"))
            .order_by(Track.title.asc())
        )
        return paginate(statement, skip, limit)

    def most_played(
        self,
        db: Session,
        limit: int = 10,
    ) -> list[Track]:
        """Return the most-listened tracks across the whole platform."""
        return (
            db.query(Track)
            .options(joinedload(Track.artist), joinedload(Track.album))
            .filter(Track.plays > 0)
            .order_by(Track.plays.desc(), Track.title.asc())
            .limit(limit)
            .all()
        )

    # ------------------------------------------------------------------ write
    def upload_for_artist(
        self,
        db: Session,
        user: User,
        payload: TrackCreate,
        file=None,
    ) -> Track:
        """Upload a track for the caller's own artist profile.

        The album must belong to the same artist.  Audio can be provided either
        as an already-hosted ``audio_url`` or as an uploaded file.
        """
        artist = artist_service.require_artist_profile(db, user)

        album = album_service.get_or_404(db, payload.album_id)
        if album.artist_id != artist.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only upload tracks to your own albums",
            )

        audio_url = payload.audio_url
        if file is not None and hasattr(file, "read"):
            uploaded_url = upload(file, kind="audio", folder="npop/audio")
            if not uploaded_url:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Track upload failed",
                )
            audio_url = uploaded_url

        if not audio_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An audio file or audio_url is required",
            )
        audio_url = ensure_http_url(audio_url, field="audio_url")

        data = payload.model_dump()
        data["artist_id"] = artist.id
        data["audio_url"] = audio_url
        return self.create(db, data)

    def play(
        self,
        db: Session,
        track_id: str,
        user_id: str | None = None,
    ) -> Track:
        """Register a listen: bump play counts and record user history."""
        track = self.get_or_404(db, track_id)

        track.plays += 1
        if track.artist is not None:
            track.artist.monthly_listeners += 1

        if user_id is not None:
            # ``record_play`` commits the play count and the history entry.
            play_history_service.record_play(db, user_id, track_id)
        else:
            db.commit()

        db.refresh(track)
        return track

    def increment_plays(self, db: Session, track_id: str) -> Track:
        track = self.get_or_404(db, track_id)
        track.plays += 1
        return commit_and_refresh(db, track)

    def update_for_artist(
        self,
        db: Session,
        user: User,
        track_id: str,
        payload: TrackUpdate,
    ) -> Track:
        artist = artist_service.require_artist_profile(db, user)
        track = self.get_or_404(db, track_id)
        if track.artist_id != artist.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only manage your own tracks",
            )

        data = payload.model_dump(
            exclude_unset=True,
            exclude={"artist_id"},
        )
        if data.get("album_id") is not None:
            album = album_service.get_or_404(db, data["album_id"])
            if album.artist_id != artist.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only move tracks to your own albums",
                )

        if data.get("audio_url"):
            data["audio_url"] = ensure_http_url(
                data["audio_url"], field="audio_url"
            )

        apply_updates(track, data)
        return commit_and_refresh(db, track)

    def delete_for_artist(
        self,
        db: Session,
        user: User,
        track_id: str,
    ) -> None:
        artist = artist_service.require_artist_profile(db, user)
        track = self.get_or_404(db, track_id)
        if track.artist_id != artist.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own tracks",
            )
        db.delete(track)
        db.commit()


track_service = TrackService()
