"""Service layer: one module per model, plus a shared CRUD base.

Every service exposes a module-level singleton (for example
``user_service``) and the class itself for testing or dependency injection.
"""

from app.services.access_token import AccessTokenService, access_token_service
from app.services.album import AlbumService, album_service
from app.services.artist import ArtistService, artist_service
from app.services.base import CRUDService
from app.services.cover_photo import CoverPhotoService, cover_photo_service
from app.services.favorite_track import FavoriteTrackService, favorite_track_service
from app.services.hashtag import HashtagService, hashtag_service
from app.services.notification import NotificationService, notification_service
from app.services.playlist import PlaylistService, playlist_service
from app.services.playlist_history import PlayHistoryService, play_history_service
from app.services.playlist_track import PlaylistTrackService, playlist_track_service
from app.services.post import PostService, post_service
from app.services.post_comment import PostCommentService, post_comment_service
from app.services.post_rating import PostRatingService, post_rating_service
from app.services.profile_picture import ProfilePictureService, profile_picture_service
from app.services.profile_track import ProfileTrackService, profile_track_service
from app.services.social_link import SocialLinkService, social_link_service
from app.services.track import TrackService, track_service
from app.services.user import UserService, user_service

__all__ = [
    "AccessTokenService",
    "AlbumService",
    "ArtistService",
    "CRUDService",
    "CoverPhotoService",
    "FavoriteTrackService",
    "HashtagService",
    "NotificationService",
    "PlayHistoryService",
    "PlaylistService",
    "PlaylistTrackService",
    "PostCommentService",
    "PostRatingService",
    "PostService",
    "ProfilePictureService",
    "ProfileTrackService",
    "SocialLinkService",
    "TrackService",
    "UserService",
    "access_token_service",
    "album_service",
    "artist_service",
    "cover_photo_service",
    "favorite_track_service",
    "hashtag_service",
    "notification_service",
    "play_history_service",
    "playlist_service",
    "playlist_track_service",
    "post_comment_service",
    "post_rating_service",
    "post_service",
    "profile_picture_service",
    "profile_track_service",
    "social_link_service",
    "track_service",
    "user_service",
]
