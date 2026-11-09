"""Playlist CRUD, track membership and reordering."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.artist import Artist
from app.models.playlist import Playlist
from app.models.playlist_track import PlaylistTrack
from app.models.user import User
from app.schemas.api import (
    PlaylistDetail,
    PlaylistTrackAddRequest,
    ReorderRequest,
)
from app.schemas.artist import ArtistRead
from app.schemas.playlist import PlaylistCreate, PlaylistRead, PlaylistUpdate
from app.schemas.playlist_track import PlaylistTrackRead
from app.services.playlist import playlist_service
from app.services.playlist_track import playlist_track_service

router = APIRouter()


@router.get("", response_model=list[PlaylistRead])
def list_playlists(
    owner_id: str | None = Query(default=None),
    system: bool = Query(default=False, description="Only system playlists"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[Playlist]:
    if owner_id:
        return playlist_service.list_by_owner(db, owner_id, skip, limit)
    if system:
        return playlist_service.list_system(db, skip, limit)
    return playlist_service.list(db, skip, limit)


@router.post("", response_model=PlaylistRead, status_code=status.HTTP_201_CREATED)
def create_playlist(
    payload: PlaylistCreate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Playlist:
    return playlist_service.create_for_owner(db, current, payload)


@router.get("/{playlist_id}", response_model=PlaylistDetail)
def get_playlist(playlist_id: str, db: Session = Depends(get_db)) -> Playlist:
    return playlist_service.get_with_tracks(db, playlist_id)


@router.patch("/{playlist_id}", response_model=PlaylistRead)
def update_playlist(
    playlist_id: str,
    payload: PlaylistUpdate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Playlist:
    return playlist_service.update_for_owner(db, current, playlist_id, payload)


@router.delete("/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_playlist(
    playlist_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    playlist_service.delete_for_owner(db, current, playlist_id)


@router.get("/{playlist_id}/tracks", response_model=list[PlaylistTrackRead])
def list_playlist_tracks(
    playlist_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[PlaylistTrack]:
    playlist_service.get_or_404(db, playlist_id)
    return playlist_track_service.list_for_playlist(db, playlist_id, skip, limit)


@router.post(
    "/{playlist_id}/tracks",
    response_model=PlaylistTrackRead,
    status_code=status.HTTP_201_CREATED,
)
def add_playlist_track(
    playlist_id: str,
    payload: PlaylistTrackAddRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PlaylistTrack:
    return playlist_service.add_track(
        db, current, playlist_id, payload.track_id, payload.position
    )


@router.put("/{playlist_id}/tracks/reorder", response_model=list[PlaylistTrackRead])
def reorder_playlist_tracks(
    playlist_id: str,
    payload: ReorderRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PlaylistTrack]:
    playlist_service.require_owner(db, current, playlist_id)
    return playlist_track_service.reorder(db, playlist_id, payload.track_ids)


@router.delete(
    "/{playlist_id}/tracks/{track_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_playlist_track(
    playlist_id: str,
    track_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    playlist_service.remove_track(db, current, playlist_id, track_id)


@router.get("/{playlist_id}/artists", response_model=list[ArtistRead])
def list_playlist_artists(
    playlist_id: str,
    db: Session = Depends(get_db),
) -> list[Artist]:
    """Distinct artists represented across the playlist's tracks."""
    return playlist_service.artists(db, playlist_id)
