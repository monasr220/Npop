"""Import every model so that ``Base.metadata`` is always complete.

Importing this package (``import app.models``) registers all mapped classes and
their tables.  Alembic or ``Base.metadata.create_all()`` can then rely on a
single import to discover the whole schema.
"""

from app.models.abstract_base import AbstractBaseModel
from app.models.access_token import AccessToken
from app.models.album import Album
from app.models.artist import Artist
from app.models.cover_photo import CoverPhoto
from app.models.favorite_track import FavoriteTrack
from app.models.hashtag import Hashtag
from app.models.notification import Notification, NotificationStatus
from app.models.playlist import Playlist
from app.models.playlist_history import PlayHistory
from app.models.playlist_track import PlaylistTrack
from app.models.post import Like, Post
from app.models.post_comment import PostComment
from app.models.post_rating import PostRating
from app.models.profile_picture import ProfilePicture
from app.models.profile_track import ProfileTrack
from app.models.social_link import SocialLink
from app.models.track import Track
from app.models.user import RoleEnum, User, followers_table

__all__ = [
    "AbstractBaseModel",
    "AccessToken",
    "Album",
    "Artist",
    "CoverPhoto",
    "FavoriteTrack",
    "Hashtag",
    "Like",
    "Notification",
    "NotificationStatus",
    "PlayHistory",
    "Playlist",
    "PlaylistTrack",
    "Post",
    "PostComment",
    "PostRating",
    "ProfilePicture",
    "ProfileTrack",
    "RoleEnum",
    "SocialLink",
    "Track",
    "User",
    "followers_table",
]
