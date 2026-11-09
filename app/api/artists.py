"""Artist profiles, verification and artist-scoped listings."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.artist import Artist
from app.models.user import User
from app.schemas.album import AlbumRead
from app.schemas.api import VerifyRequest
from app.schemas.artist import ArtistCreate, ArtistRead, ArtistUpdate
from app.schemas.track import TrackRead
from app.services.album import album_service
from app.services.artist import artist_service
from app.services.track import track_service

router = APIRouter()


@router.get("", response_model=list[ArtistRead])
def list_artists(
    q: str | None = Query(default=None, description="Search artist name"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Artist]:
    if q:
        return artist_service.search(db, q, skip, limit)
    return artist_service.list(db, skip, limit)


@router.post("", response_model=ArtistRead, status_code=status.HTTP_201_CREATED)
def create_artist_profile(
    payload: ArtistCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Artist:
    return artist_service.create_for_user(db, current, payload)


@router.get("/me", response_model=ArtistRead)
def my_artist_profile(
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Artist:
    return artist_service.require_artist_profile(db, current)


@router.get("/{artist_id}", response_model=ArtistRead)
def get_artist(artist_id: str, db: Session = Depends(get_db)) -> Artist:
    return artist_service.get_or_404(db, artist_id)


@router.patch("/{artist_id}", response_model=ArtistRead)
def update_artist(
    artist_id: str,
    payload: ArtistUpdate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Artist:
    artist = artist_service.require_artist_profile(db, current)
    if artist.id != artist_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own artist profile",
        )
    return artist_service.update_for_user(db, current, payload)


@router.post("/{artist_id}/verify", response_model=ArtistRead)
def verify_artist(
    artist_id: str,
    payload: VerifyRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Artist:
    require_admin(current)
    return artist_service.verify(db, artist_id, payload.verified)


@router.get("/{artist_id}/albums", response_model=list[AlbumRead])
def list_artist_albums(
    artist_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list:
    artist_service.get_or_404(db, artist_id)
    return album_service.list_by_artist(db, artist_id, skip, limit)


@router.get("/{artist_id}/tracks", response_model=list[TrackRead])
def list_artist_tracks(
    artist_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list:
    artist_service.get_or_404(db, artist_id)
    return track_service.list_by_artist(db, artist_id, skip, limit)
