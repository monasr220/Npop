"""Pydantic schemas mirroring :mod:`app.models`.

Each model module has a matching schema module.  Request schemas (``*Create``,
``*Update``) reject unknown fields; response schemas (``*Read``) can be built
directly from ORM instances.
"""

from app.schemas.access_token import (
    AccessTokenCreate,
    AccessTokenRead,
    AccessTokenUpdate,
)
from app.schemas.album import AlbumCreate, AlbumRead, AlbumUpdate
from app.schemas.artist import ArtistCreate, ArtistRead, ArtistUpdate
from app.schemas.common import BaseReadSchema, BaseSchema
from app.schemas.cover_photo import (
    CoverPhotoCreate,
    CoverPhotoRead,
    CoverPhotoUpdate,
)
from app.schemas.favorite_track import FavoriteTrackCreate, FavoriteTrackRead
from app.schemas.hashtag import HashtagCreate, HashtagRead, HashtagUpdate
from app.schemas.notification import (
    NotificationCreate,
    NotificationRead,
    NotificationStatus,
    NotificationUpdate,
)
from app.schemas.playlist import PlaylistCreate, PlaylistRead, PlaylistUpdate
from app.schemas.playlist_history import (
    PlayHistoryCreate,
    PlayHistoryRead,
    PlayHistoryUpdate,
)
from app.schemas.playlist_track import (
    PlaylistTrackCreate,
    PlaylistTrackRead,
    PlaylistTrackUpdate,
)
from app.schemas.post import (
    LikeCreate,
    LikeRead,
    LikeUpdate,
    PostCreate,
    PostRatingCreate,
    PostRatingRead,
    PostRatingUpdate,
    PostRead,
    PostUpdate,
)
from app.schemas.post_comment import (
    PostCommentCreate,
    PostCommentRead,
    PostCommentUpdate,
)
from app.schemas.profile_picture import (
    ProfilePictureCreate,
    ProfilePictureRead,
    ProfilePictureUpdate,
)
from app.schemas.profile_track import (
    ProfileTrackCreate,
    ProfileTrackRead,
    ProfileTrackUpdate,
)
from app.schemas.social_link import SocialLinkCreate, SocialLinkRead, SocialLinkUpdate
from app.schemas.track import TrackCreate, TrackRead, TrackUpdate
from app.schemas.user import RoleEnum, UserCreate, UserRead, UserUpdate

__all__ = [
    "AccessTokenCreate",
    "AccessTokenRead",
    "AccessTokenUpdate",
    "AlbumCreate",
    "AlbumRead",
    "AlbumUpdate",
    "ArtistCreate",
    "ArtistRead",
    "ArtistUpdate",
    "BaseReadSchema",
    "BaseSchema",
    "CoverPhotoCreate",
    "CoverPhotoRead",
    "CoverPhotoUpdate",
    "FavoriteTrackCreate",
    "FavoriteTrackRead",
    "HashtagCreate",
    "HashtagRead",
    "HashtagUpdate",
    "LikeCreate",
    "LikeRead",
    "LikeUpdate",
    "NotificationCreate",
    "NotificationRead",
    "NotificationStatus",
    "NotificationUpdate",
    "PlayHistoryCreate",
    "PlayHistoryRead",
    "PlayHistoryUpdate",
    "PlaylistCreate",
    "PlaylistRead",
    "PlaylistTrackCreate",
    "PlaylistTrackRead",
    "PlaylistTrackUpdate",
    "PlaylistUpdate",
    "PostCommentCreate",
    "PostCommentRead",
    "PostCommentUpdate",
    "PostCreate",
    "PostRatingCreate",
    "PostRatingRead",
    "PostRatingUpdate",
    "PostRead",
    "PostUpdate",
    "ProfilePictureCreate",
    "ProfilePictureRead",
    "ProfilePictureUpdate",
    "ProfileTrackCreate",
    "ProfileTrackRead",
    "ProfileTrackUpdate",
    "RoleEnum",
    "SocialLinkCreate",
    "SocialLinkRead",
    "SocialLinkUpdate",
    "TrackCreate",
    "TrackRead",
    "TrackUpdate",
    "UserCreate",
    "UserRead",
    "UserUpdate",
]
