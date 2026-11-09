"""Aggregate every API router under a single ``/api`` mount point."""

from __future__ import annotations

from fastapi import APIRouter

from app.api import (
    albums,
    artists,
    auth,
    hashtags,
    notifications,
    playlists,
    posts,
    tracks,
    users,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(artists.router, prefix="/artists", tags=["artists"])
api_router.include_router(albums.router, prefix="/albums", tags=["albums"])
api_router.include_router(tracks.router, prefix="/tracks", tags=["tracks"])
api_router.include_router(playlists.router, prefix="/playlists", tags=["playlists"])
api_router.include_router(posts.router, prefix="/posts", tags=["posts"])
api_router.include_router(hashtags.router, prefix="/hashtags", tags=["hashtags"])
api_router.include_router(
    notifications.router, prefix="/notifications", tags=["notifications"]
)
