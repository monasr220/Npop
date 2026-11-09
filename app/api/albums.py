"""Album endpoints, including artist-only creation and cover uploads."""

from __future__ import annotations

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.album import Album
from app.models.user import User
from app.schemas.album import AlbumCreate, AlbumRead, AlbumUpdate
from app.schemas.api import AlbumDetail
from app.schemas.track import TrackRead
from app.services.album import album_service
from app.services.track import track_service

router = APIRouter()


@router.get("", response_model=list[AlbumRead])
def list_albums(
    artist_id: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Album]:
    if artist_id:
        return album_service.list_by_artist(db, artist_id, skip, limit)
    return album_service.list(db, skip, limit)


@router.post("", response_model=AlbumRead, status_code=status.HTTP_201_CREATED)
def create_album(
    payload: AlbumCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Album:
    return album_service.create_for_artist(db, current, payload)


@router.get("/{album_id}", response_model=AlbumDetail)
def get_album(album_id: str, db: Session = Depends(get_db)) -> Album:
    return album_service.get_with_tracks(db, album_id)


@router.patch("/{album_id}", response_model=AlbumRead)
def update_album(
    album_id: str,
    payload: AlbumUpdate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Album:
    return album_service.update_for_artist(db, current, album_id, payload)


@router.delete("/{album_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_album(
    album_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    album_service.delete_for_artist(db, current, album_id)


@router.post("/{album_id}/cover", response_model=AlbumRead)
def upload_album_cover(
    album_id: str,
    file: UploadFile | None = File(default=None),
    cover_url: str | None = Form(default=None),
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Album:
    if file is None and not cover_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide a cover file or cover_url",
        )
    return album_service.upload_cover(
        db, current, album_id, file if file is not None else cover_url
    )


@router.get("/{album_id}/tracks", response_model=list[TrackRead])
def list_album_tracks(
    album_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list:
    album_service.get_or_404(db, album_id)
    return track_service.list_by_album(db, album_id, skip, limit)
