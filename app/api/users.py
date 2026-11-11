"""User profiles, follow graph, favourites, profile tracks and listening."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_self
from app.db.session import get_db
from app.models.user import RoleEnum, User
from app.schemas.api import (
    FollowCounts,
    FollowState,
    ImageUrlRequest,
    ProfileMusicResponse,
    ProfileTrackAddRequest,
    ReorderRequest,
    SocialLinksRequest,
    UserPublic,
)
from app.schemas.cover_photo import CoverPhotoRead
from app.schemas.playlist_history import PlayHistoryRead
from app.schemas.profile_picture import ProfilePictureRead
from app.schemas.profile_track import ProfileTrackRead
from app.schemas.social_link import SocialLinkRead
from app.schemas.track import TrackRead
from app.schemas.user import UserRead, UserUpdate
from app.services.cover_photo import cover_photo_service
from app.services.playlist_history import play_history_service
from app.services.profile_picture import profile_picture_service
from app.services.social_link import social_link_service
from app.services.user import user_service

router = APIRouter()


# --------------------------------------------------------------------- read
@router.get("", response_model=list[UserPublic])
def list_users(
    q: str | None = Query(default=None, description="Search username or email"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[User]:
    if q:
        return user_service.search(db, q, skip, limit)
    return user_service.list(db, skip, limit)


@router.get("/{user_id}", response_model=UserPublic)
def get_user(user_id: str, db: Session = Depends(get_db)) -> User:
    return user_service.get_or_404(db, user_id)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: str,
    payload: UserUpdate,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if current.role != RoleEnum.admin:
        # Only admins may change roles or last-login metadata.
        payload = UserUpdate(
            **payload.model_dump(exclude_unset=True, exclude={"role", "last_login"})
        )
    return user_service.update_profile(db, current, user_id, payload)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    user_service.delete_profile(db, current, user_id)


# --------------------------------------------------------------- follow graph
@router.post("/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
def follow_user(
    user_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    user_service.follow(db, current, user_id)


@router.delete("/{user_id}/follow", status_code=status.HTTP_204_NO_CONTENT)
def unfollow_user(
    user_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    user_service.unfollow(db, current, user_id)


@router.get("/{user_id}/followers", response_model=list[UserPublic])
def list_followers(user_id: str, db: Session = Depends(get_db)) -> list[User]:
    user = user_service.get_or_404(db, user_id)
    return user_service.followers(db, user)


@router.get("/{user_id}/followings", response_model=list[UserPublic])
def list_followings(user_id: str, db: Session = Depends(get_db)) -> list[User]:
    user = user_service.get_or_404(db, user_id)
    return user_service.followings(db, user)


@router.get("/{user_id}/follow-counts", response_model=FollowCounts)
def follow_counts(user_id: str, db: Session = Depends(get_db)) -> FollowCounts:
    user_service.get_or_404(db, user_id)
    return FollowCounts(
        followers=user_service.followers_count(db, user_id),
        followings=user_service.followings_count(db, user_id),
    )


@router.get("/{user_id}/is-following/{target_id}", response_model=FollowState)
def is_following(user_id: str, target_id: str, db: Session = Depends(get_db)) -> FollowState:
    return FollowState(following=user_service.is_following(db, user_id, target_id))


# ---------------------------------------------------------------- favourites
@router.get("/{user_id}/favorites", response_model=list[TrackRead])
def list_favorites(
    user_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list:
    return user_service.list_favorite_tracks(db, user_id, skip, limit)


@router.post(
    "/{user_id}/favorites/{track_id}",
    status_code=status.HTTP_201_CREATED,
)
def add_favorite(
    user_id: str,
    track_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    require_self(current, user_id)
    favorite = user_service.add_favorite(db, current, track_id)
    return {"id": favorite.id, "user_id": favorite.user_id, "track_id": favorite.track_id}


@router.delete(
    "/{user_id}/favorites/{track_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_favorite(
    user_id: str,
    track_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    require_self(current, user_id)
    user_service.remove_favorite(db, current, track_id)


# ------------------------------------------------------------ profile tracks
@router.get("/{user_id}/profile-tracks", response_model=list[ProfileTrackRead])
def list_profile_tracks(
    user_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list:
    return user_service.list_profile_tracks(db, user_id, skip, limit)


@router.post(
    "/{user_id}/profile-tracks",
    response_model=ProfileTrackRead,
    status_code=status.HTTP_201_CREATED,
)
def add_profile_track(
    user_id: str,
    payload: ProfileTrackAddRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_self(current, user_id)
    return user_service.add_profile_track(
        db, current, payload.track_id, payload.position
    )


@router.patch("/{user_id}/profile-tracks/reorder", response_model=list[ProfileTrackRead])
def reorder_profile_tracks(
    user_id: str,
    payload: ReorderRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list:
    require_self(current, user_id)
    return user_service.reorder_profile_tracks(db, current, payload.track_ids)


@router.delete(
    "/{user_id}/profile-tracks/{track_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_profile_track(
    user_id: str,
    track_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    require_self(current, user_id)
    user_service.remove_profile_track(db, current, track_id)


# ----------------------------------------------------------------- listening
@router.get("/{user_id}/history", response_model=list[PlayHistoryRead])
def play_history(
    user_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list:
    user_service.get_or_404(db, user_id)
    return play_history_service.list_for_user(db, user_id, skip, limit)


@router.get("/{user_id}/recently-played", response_model=list[TrackRead])
def recently_played(
    user_id: str,
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list:
    user_service.get_or_404(db, user_id)
    return user_service.recently_played(db, user_id, limit)


@router.get("/{user_id}/most-played", response_model=list[TrackRead])
def most_played_for_user(
    user_id: str,
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list:
    user_service.get_or_404(db, user_id)
    return user_service.most_played_for_user(db, user_id, limit)


@router.get("/{user_id}/music", response_model=ProfileMusicResponse)
def profile_music(user_id: str, db: Session = Depends(get_db)) -> ProfileMusicResponse:
    return ProfileMusicResponse(**user_service.get_profile_music(db, user_id))


# ------------------------------------------------------------ profile media
@router.get("/{user_id}/profile-pictures", response_model=list[ProfilePictureRead])
def list_profile_pictures(user_id: str, db: Session = Depends(get_db)) -> list:
    return profile_picture_service.list_for_user(db, user_id)


@router.post(
    "/{user_id}/profile-picture",
    response_model=ProfilePictureRead,
    status_code=status.HTTP_201_CREATED,
)
def set_profile_picture(
    user_id: str,
    payload: ImageUrlRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_self(current, user_id)
    return profile_picture_service.create_for_user(db, user_id, payload.image_url)


@router.get("/{user_id}/cover-photos", response_model=list[CoverPhotoRead])
def list_cover_photos(user_id: str, db: Session = Depends(get_db)) -> list:
    return cover_photo_service.list_for_user(db, user_id)


@router.post(
    "/{user_id}/cover-photo",
    response_model=CoverPhotoRead,
    status_code=status.HTTP_201_CREATED,
)
def set_cover_photo(
    user_id: str,
    payload: ImageUrlRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_self(current, user_id)
    return cover_photo_service.create_for_user(db, user_id, payload.image_url)


@router.get("/{user_id}/social-links", response_model=list[SocialLinkRead])
def list_social_links(user_id: str, db: Session = Depends(get_db)) -> list:
    return social_link_service.list_for_user(db, user_id)


@router.put("/{user_id}/social-links", response_model=list[SocialLinkRead])
def replace_social_links(
    user_id: str,
    payload: SocialLinksRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list:
    require_self(current, user_id)
    return social_link_service.replace_for_user(db, user_id, payload.links)
