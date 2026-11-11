"""API request/response schemas that do not map 1:1 to a single model.

The per-model schemas live next to their model in ``app/schemas``.  This module
holds the shapes used by the HTTP layer: auth envelopes, nested detail views
and small request bodies whose owner/user id comes from the access token.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import Field

from app.schemas.album import AlbumRead
from app.schemas.common import BaseSchema
from app.schemas.favorite_track import FavoriteTrackRead
from app.schemas.playlist import PlaylistRead
from app.schemas.playlist_track import PlaylistTrackRead
from app.schemas.post import LikeRead, PostRead
from app.schemas.post_comment import PostCommentRead
from app.schemas.profile_track import ProfileTrackRead
from app.schemas.track import TrackRead
from app.schemas.user import UserPublic, UserRead


# --------------------------------------------------------------------- auth
class LoginRequest(BaseSchema):
    email: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=1024)


class TokenResponse(BaseSchema):
    access_token: str
    token_type: str = "bearer"
    expiry_time: datetime
    user: UserRead


# --------------------------------------------------------------------- users
class ProfileMusicResponse(BaseSchema):
    user: UserPublic
    profile_tracks: list[ProfileTrackRead]
    favorites: list[FavoriteTrackRead]
    favorite_tracks: list[TrackRead]
    recently_played: list[TrackRead]
    most_played: list[TrackRead]
    playlists: list[PlaylistRead]


class FollowCounts(BaseSchema):
    followers: int
    followings: int


class FollowState(BaseSchema):
    following: bool


class ImageUrlRequest(BaseSchema):
    image_url: str = Field(min_length=1, max_length=512)


class SocialLinksRequest(BaseSchema):
    links: list[str] = Field(default_factory=list)


class ProfileTrackAddRequest(BaseSchema):
    track_id: str = Field(min_length=1, max_length=36)
    position: int | None = Field(default=None, ge=0)


class ReorderRequest(BaseSchema):
    track_ids: list[str] = Field(min_length=1)


# -------------------------------------------------------------------- albums
class AlbumDetail(AlbumRead):
    tracks: list[TrackRead] = Field(default_factory=list)


# -------------------------------------------------------------------- tracks
class TrackUploadRequest(BaseSchema):
    """Upload a track that is already hosted at ``audio_url``."""

    title: str = Field(min_length=1, max_length=200)
    album_id: str = Field(min_length=1, max_length=36)
    duration: int = Field(default=0, ge=0)
    audio_url: str = Field(min_length=1, max_length=512)
    track_number: int = Field(default=1, ge=1)
    explicit: bool = False


# ----------------------------------------------------------------- playlists
class PlaylistTrackDetail(PlaylistTrackRead):
    track: TrackRead | None = None


class PlaylistDetail(PlaylistRead):
    entries: list[PlaylistTrackDetail] = Field(default_factory=list)


class PlaylistTrackAddRequest(BaseSchema):
    track_id: str = Field(min_length=1, max_length=36)
    position: int | None = Field(default=None, ge=0)


# --------------------------------------------------------------------- posts
class PostCreateRequest(BaseSchema):
    content: str | None = Field(default=None, max_length=1024)
    image: str | None = Field(default=None, max_length=1024)
    video: str | None = Field(default=None, max_length=1024)
    track_id: str | None = Field(default=None, max_length=36)
    original_post_id: str | None = Field(default=None, max_length=36)


class CommentCreateRequest(BaseSchema):
    comment: str = Field(min_length=1)


class RepostRequest(BaseSchema):
    content: str | None = Field(default=None, max_length=1024)


class RatingRequest(BaseSchema):
    rating: int = Field(ge=1, le=5)


class RatingSummary(BaseSchema):
    average_rating: float | None
    rating_count: int


class PostCommentDetail(PostCommentRead):
    user: UserPublic | None = None


class PostLikeDetail(LikeRead):
    user: UserPublic | None = None


class PostDetail(PostRead):
    comments: list[PostCommentDetail] = Field(default_factory=list)
    likes: list[PostLikeDetail] = Field(default_factory=list)


# ---------------------------------------------------------------- misc/forms
class VerifyRequest(BaseSchema):
    verified: bool = True


class MessageResponse(BaseSchema):
    message: str


class UnreadCount(BaseSchema):
    count: int


class UpdatedResponse(BaseSchema):
    updated: int
