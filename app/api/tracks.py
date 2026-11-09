"""Track listing, artist uploads, playback and artist-only management."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_optional_user
from app.db.session import get_db
from app.models.track import Track
from app.models.user import User
from app.schemas.track import TrackCreate, TrackRead, TrackUpdate
from app.schemas.api import TrackUploadRequest
from app.services.artist import artist_service
from app.services.track import track_service

router = APIRouter()


@router.get("", response_model=list[TrackRead])
def list_tracks(
    q: str | None = Query(default=None, description="Search track title"),
    artist_id: str | None = Query(default=None),
    album_id: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Track]:
    if q:
        return track_service.search(db, q, skip, limit)
    if artist_id:
        return track_service.list_by_artist(db, artist_id, skip, limit)
    if album_id:
        return track_service.list_by_album(db, album_id, skip, limit)
    return track_service.list(db, skip, limit)


@router.get("/most-played", response_model=list[TrackRead])
def most_played(
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Track]:
    return track_service.most_played(db, limit)


@router.post("/hosted", response_model=TrackRead, status_code=status.HTTP_201_CREATED)
def upload_hosted_track(
    payload: TrackUploadRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Track:
    """Upload a track whose audio is already hosted (JSON variant)."""
    artist = artist_service.require_artist_profile(db, current)
    track_payload = TrackCreate(artist_id=artist.id, **payload.model_dump())
    return track_service.upload_for_artist(db, current, track_payload)


@router.post("", response_model=TrackRead, status_code=status.HTTP_201_CREATED)
def upload_track(
    title: str = Form(min_length=1, max_length=200),
    album_id: str = Form(min_length=1, max_length=36),
    duration: int = Form(default=0, ge=0),
    audio_url: str = Form(default="", max_length=512),
    track_number: int = Form(default=1, ge=1),
    explicit: bool = Form(default=False),
    file: UploadFile | None = File(default=None),
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Track:
    """Upload a track to one of the caller's own albums.

    Send either an audio ``file`` (multipart) or an already-hosted
    ``audio_url``.  The artist id is derived from the caller's artist profile.
    """
    artist = artist_service.require_artist_profile(db, current)
    payload = TrackCreate(
        title=title,
        album_id=album_id,
        artist_id=artist.id,
        duration=duration,
        audio_url=audio_url,
        track_number=track_number,
        explicit=explicit,
    )
    return track_service.upload_for_artist(db, current, payload, file)


@router.get("/{track_id}", response_model=TrackRead)
def get_track(track_id: str, db: Session = Depends(get_db)) -> Track:
    return track_service.get_or_404(db, track_id)


@router.patch("/{track_id}", response_model=TrackRead)
def update_track(
    track_id: str,
    payload: TrackUpdate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Track:
    return track_service.update_for_artist(db, current, track_id, payload)


@router.delete("/{track_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_track(
    track_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    track_service.delete_for_artist(db, current, track_id)


@router.post("/{track_id}/play", response_model=TrackRead)
def play_track(
    track_id: str,
    current: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> Track:
    """Register a listen and bump the play counters.

    Anonymous listeners are allowed; authenticated ones also get a play-history
    entry.
    """
    return track_service.play(db, track_id, current.id if current else None)
