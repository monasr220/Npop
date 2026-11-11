"""End-to-end API test using FastAPI ``TestClient`` and in-memory SQLite.

Every request goes through the real routers, dependencies, services and Pydantic
response models.  The database dependency is overridden with a ``StaticPool``
in-memory engine so all requests share one database and the project's
``app.db`` is never touched.

Run from the project root::

    uv run scripts/check_api.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import app.models  # noqa: E402,F401
from app.core.config import settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.user import RoleEnum, User  # noqa: E402

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    bind=engine, autoflush=False, expire_on_commit=False
)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


def check(label: str, condition: bool, extra: str = "") -> None:
    if not condition:
        raise AssertionError(f"{label} {extra}".strip())
    print(f"OK {label}" + (f" -> {extra}" if extra else ""))


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def register(client: TestClient, username: str, email: str) -> dict:
    response = client.post(
        "/api/auth/register",
        json={
            "username": username,
            "email": email,
            "password": "password123",
            "bio": f"{username} bio",
        },
    )
    check(f"register {username}", response.status_code == 201, str(response.text[:160]))
    body = response.json()
    check(f"register {username} role", body["user"]["role"] == "user")
    return body


def run() -> None:
    with TestClient(app) as client:
        # ------------------------------------------------------------ health
        health = client.get("/health")
        check("health", health.status_code == 200 and health.json() == {"status": "ok"})

        cors = any(
            middleware.cls.__name__ == "CORSMiddleware"
            for middleware in app.user_middleware
        )
        check("CORS middleware", cors)

        index = client.get("/")
        check(
            "frontend index served",
            index.status_code == 200 and 'id="root"' in index.text,
        )
        asset_paths = re.findall(r'(?:src|href)="(/assets/[^"]+)"', index.text)
        check("frontend build assets referenced", len(asset_paths) >= 2, str(asset_paths))
        for asset_path in asset_paths:
            asset = client.get(asset_path)
            check(
                f"frontend asset {asset_path}",
                asset.status_code == 200
                and "immutable" in asset.headers.get("cache-control", ""),
            )

        spa = client.get("/privacy-policy")
        check(
            "SPA fallback for client routes",
            spa.status_code == 200 and 'id="root"' in spa.text,
        )
        missing_api = client.get("/api/does-not-exist")
        check(
            "unknown API path is JSON 404",
            missing_api.status_code == 404
            and missing_api.headers["content-type"].startswith("application/json"),
        )
        check(
            "security headers present",
            index.headers.get("x-content-type-options") == "nosniff"
            and index.headers.get("x-frame-options") == "DENY"
            and "content-security-policy" in index.headers
            and "referrer-policy" in index.headers,
        )
        check(
            "request id header present",
            bool(index.headers.get("x-request-id")),
        )

        # -------------------------------------------------------------- auth
        alice = register(client, "alice", "alice@example.com")
        bob = register(client, "bob", "bob@example.com")
        alice_token = alice["access_token"]
        bob_token = bob["access_token"]
        alice_id = alice["user"]["id"]
        bob_id = bob["user"]["id"]

        me = client.get("/api/auth/me", headers=auth(alice_token))
        check("auth/me", me.status_code == 200 and me.json()["email"] == "alice@example.com")

        # Admin accounts are provisioned directly (self-registration is always user).
        with TestingSessionLocal() as db:
            admin = User(
                username="admin",
                email="admin@example.com",
                password=hash_password("adminpass123"),
                role=RoleEnum.admin,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        login = client.post(
            "/api/auth/login",
            json={"email": "admin@example.com", "password": "adminpass123"},
        )
        check("login admin", login.status_code == 200)
        admin_token = login.json()["access_token"]

        users = client.get("/api/users")
        check("list users", users.status_code == 200 and len(users.json()) == 3)
        check("public user hides email", "email" not in users.json()[0])

        profile = client.get(f"/api/users/{alice_id}")
        check("get public profile", profile.status_code == 200)
        check("public profile hides email", "email" not in profile.json())

        updated = client.patch(
            f"/api/users/{alice_id}",
            json={"bio": "music lover", "role": "admin"},
            headers=auth(alice_token),
        )
        check("update own profile", updated.status_code == 200)
        check("role escalation blocked", updated.json()["role"] == "user")

        # ----------------------------------------------------------- artists
        artist_response = client.post(
            "/api/artists",
            json={"name": "Alice Artist", "bio": "synths"},
            headers=auth(alice_token),
        )
        check(
            "create artist profile",
            artist_response.status_code == 201,
            str(artist_response.text[:160]),
        )
        artist_id = artist_response.json()["id"]

        artists = client.get("/api/artists", params={"q": "Alice"})
        check("search artists", artists.status_code == 200 and len(artists.json()) == 1)
        my_artist = client.get("/api/artists/me", headers=auth(alice_token))
        check("artist me", my_artist.status_code == 200 and my_artist.json()["id"] == artist_id)

        verify = client.post(
            f"/api/artists/{artist_id}/verify",
            json={"verified": True},
            headers=auth(admin_token),
        )
        check("admin verifies artist", verify.status_code == 200 and verify.json()["verified"])

        duplicate = client.post(
            "/api/artists",
            json={"name": "Alice Again"},
            headers=auth(alice_token),
        )
        check("duplicate artist rejected", duplicate.status_code == 400)

        # ------------------------------------------------------------ albums
        album_response = client.post(
            "/api/albums",
            json={
                "title": "First Light",
                "artist_id": artist_id,
                "release_year": 2026,
                "kind": "album",
            },
            headers=auth(alice_token),
        )
        check(
            "create album",
            album_response.status_code == 201,
            str(album_response.text[:160]),
        )
        album_id = album_response.json()["id"]

        no_artist_album = client.post(
            "/api/albums",
            json={"title": "Nope", "artist_id": artist_id},
            headers=auth(bob_token),
        )
        check("non-artist cannot create album", no_artist_album.status_code == 403)

        cover = client.patch(
            f"/api/albums/{album_id}",
            json={"cover_url": "https://example.com/cover.png"},
            headers=auth(alice_token),
        )
        check("update album cover", cover.status_code == 200)
        check("cover saved", cover.json()["cover_url"].endswith("cover.png"))

        # ------------------------------------------------------------ tracks
        track_response = client.post(
            "/api/tracks/hosted",
            json={
                "title": "Neon",
                "album_id": album_id,
                "duration": 210,
                "audio_url": "https://example.com/neon.mp3",
                "track_number": 1,
                "explicit": False,
            },
            headers=auth(alice_token),
        )
        check(
            "upload hosted track",
            track_response.status_code == 201,
            str(track_response.text[:160]),
        )
        track_id = track_response.json()["id"]

        bad_upload = client.post(
            "/api/tracks",
            data={"title": "Bad", "album_id": album_id},
            files={"file": ("evil.txt", b"not audio", "text/plain")},
            headers=auth(alice_token),
        )
        check(
            "upload rejects wrong file type",
            bad_upload.status_code == 400,
            str(bad_upload.text[:160]),
        )
        bad_url = client.post(
            "/api/tracks/hosted",
            json={
                "title": "Bad URL",
                "album_id": album_id,
                "audio_url": "javascript:alert(1)",
            },
            headers=auth(alice_token),
        )
        check("hosted upload rejects non-http URL", bad_url.status_code == 400)

        no_artist_track = client.post(
            "/api/tracks/hosted",
            json={
                "title": "Nope",
                "album_id": album_id,
                "audio_url": "https://example.com/x.mp3",
            },
            headers=auth(bob_token),
        )
        check("non-artist cannot upload track", no_artist_track.status_code == 403)

        tracks = client.get("/api/tracks", params={"artist_id": artist_id})
        check("list artist tracks", tracks.status_code == 200 and len(tracks.json()) == 1)
        artist_albums = client.get(f"/api/artists/{artist_id}/albums")
        check("list artist albums", artist_albums.status_code == 200 and len(artist_albums.json()) == 1)
        artist_tracks = client.get(f"/api/artists/{artist_id}/tracks")
        check("list artist tracks endpoint", artist_tracks.status_code == 200 and len(artist_tracks.json()) == 1)
        search = client.get("/api/tracks", params={"q": "Neon"})
        check("search tracks", search.status_code == 200 and len(search.json()) == 1)
        album_detail = client.get(f"/api/albums/{album_id}")
        check(
            "album detail includes tracks",
            album_detail.status_code == 200 and len(album_detail.json()["tracks"]) == 1,
        )

        anonymous_play = client.post(f"/api/tracks/{track_id}/play")
        check("anonymous play", anonymous_play.status_code == 200)
        authed_play = client.post(f"/api/tracks/{track_id}/play", headers=auth(alice_token))
        check("authenticated play", authed_play.status_code == 200)
        check("play count incremented", authed_play.json()["plays"] == 2)

        most_played = client.get("/api/tracks/most-played")
        check(
            "most played",
            most_played.status_code == 200 and most_played.json()[0]["id"] == track_id,
        )
        history = client.get(f"/api/users/{alice_id}/history")
        check("play history", history.status_code == 200 and len(history.json()) == 1)
        recent = client.get(f"/api/users/{alice_id}/recently-played")
        check("recently played", recent.status_code == 200 and len(recent.json()) == 1)

        track_update = client.patch(
            f"/api/tracks/{track_id}",
            json={"title": "Neon Nights"},
            headers=auth(alice_token),
        )
        check("update track", track_update.status_code == 200)
        check("track title updated", track_update.json()["title"] == "Neon Nights")

        # --------------------------------------------------------- playlists
        playlist_response = client.post(
            "/api/playlists",
            json={"name": "Favourites", "description": "best of"},
            headers=auth(alice_token),
        )
        check("create playlist", playlist_response.status_code == 201)
        playlist_id = playlist_response.json()["id"]
        check("playlist owner derived", playlist_response.json()["owner_id"] == alice_id)

        add_entry = client.post(
            f"/api/playlists/{playlist_id}/tracks",
            json={"track_id": track_id},
            headers=auth(alice_token),
        )
        check("add playlist track", add_entry.status_code == 201)

        detail = client.get(f"/api/playlists/{playlist_id}")
        check(
            "playlist detail includes nested track",
            detail.status_code == 200
            and detail.json()["entries"][0]["track"]["title"] == "Neon Nights",
        )
        reorder = client.put(
            f"/api/playlists/{playlist_id}/tracks/reorder",
            json={"track_ids": [track_id]},
            headers=auth(alice_token),
        )
        check("reorder playlist", reorder.status_code == 200)
        playlist_artists = client.get(f"/api/playlists/{playlist_id}/artists")
        check(
            "playlist artists",
            playlist_artists.status_code == 200
            and playlist_artists.json()[0]["name"] == "Alice Artist",
        )

        bob_edit = client.patch(
            f"/api/playlists/{playlist_id}",
            json={"name": "Hijacked"},
            headers=auth(bob_token),
        )
        check("non-owner cannot edit playlist", bob_edit.status_code == 403)

        remove_entry = client.delete(
            f"/api/playlists/{playlist_id}/tracks/{track_id}",
            headers=auth(alice_token),
        )
        check("remove playlist track", remove_entry.status_code == 204)

        # ------------------------------------------------- favourites/profile
        favorite = client.post(
            f"/api/users/{alice_id}/favorites/{track_id}",
            headers=auth(alice_token),
        )
        check("add favourite", favorite.status_code == 201)
        favorites = client.get(f"/api/users/{alice_id}/favorites")
        check("list favourites", favorites.status_code == 200 and len(favorites.json()) == 1)

        pinned = client.post(
            f"/api/users/{alice_id}/profile-tracks",
            json={"track_id": track_id},
            headers=auth(alice_token),
        )
        check("pin profile track", pinned.status_code == 201)
        pinned_reorder = client.patch(
            f"/api/users/{alice_id}/profile-tracks/reorder",
            json={"track_ids": [track_id]},
            headers=auth(alice_token),
        )
        check("reorder profile tracks", pinned_reorder.status_code == 200)

        music = client.get(f"/api/users/{alice_id}/music")
        check(
            "profile music bundle",
            music.status_code == 200
            and music.json()["favorite_tracks"][0]["id"] == track_id
            and len(music.json()["most_played"]) == 1,
        )

        picture = client.post(
            f"/api/users/{alice_id}/profile-picture",
            json={"image_url": "https://example.com/me.png"},
            headers=auth(alice_token),
        )
        check("set profile picture", picture.status_code == 201)
        pictures = client.get(f"/api/users/{alice_id}/profile-pictures")
        check("list profile pictures", pictures.status_code == 200 and len(pictures.json()) == 1)

        cover_photo = client.post(
            f"/api/users/{alice_id}/cover-photo",
            json={"image_url": "https://example.com/banner.png"},
            headers=auth(alice_token),
        )
        check("set cover photo", cover_photo.status_code == 201)

        social = client.put(
            f"/api/users/{alice_id}/social-links",
            json={"links": ["https://a.example", "https://b.example"]},
            headers=auth(alice_token),
        )
        check("replace social links", social.status_code == 200 and len(social.json()) == 2)
        social_list = client.get(f"/api/users/{alice_id}/social-links")
        check("list social links", social_list.status_code == 200 and len(social_list.json()) == 2)

        # -------------------------------------------------------------- follow
        follow = client.post(f"/api/users/{alice_id}/follow", headers=auth(bob_token))
        check("follow", follow.status_code == 204)
        counts = client.get(f"/api/users/{alice_id}/follow-counts")
        check("follow counts", counts.status_code == 200 and counts.json()["followers"] == 1)
        following = client.get(f"/api/users/{bob_id}/is-following/{alice_id}")
        check("is following", following.status_code == 200 and following.json()["following"])
        followers = client.get(f"/api/users/{alice_id}/followers")
        check("list followers", followers.status_code == 200 and len(followers.json()) == 1)

        # --------------------------------------------------------------- posts
        post_response = client.post(
            "/api/posts",
            json={"content": "Now playing", "track_id": track_id},
            headers=auth(alice_token),
        )
        check("create song post", post_response.status_code == 201)
        post_id = post_response.json()["id"]

        post_detail = client.get(f"/api/posts/{post_id}")
        check(
            "post detail nested",
            post_detail.status_code == 200
            and post_detail.json()["user"]["username"] == "alice"
            and post_detail.json()["track"]["id"] == track_id,
        )

        comment = client.post(
            f"/api/posts/{post_id}/comments",
            json={"comment": "great track"},
            headers=auth(bob_token),
        )
        check("create comment", comment.status_code == 201)
        comments = client.get(f"/api/posts/{post_id}/comments")
        check(
            "list comments with user",
            comments.status_code == 200
            and comments.json()[0]["user"]["username"] == "bob",
        )

        like = client.post(f"/api/posts/{post_id}/like", headers=auth(bob_token))
        check("like post", like.status_code == 200 and like.json()["liked"])
        likes = client.get(f"/api/posts/{post_id}/likes")
        check("list likes", likes.status_code == 200 and len(likes.json()) == 1)

        rating = client.post(
            f"/api/posts/{post_id}/rating",
            json={"rating": 5},
            headers=auth(bob_token),
        )
        check("rate post", rating.status_code == 200 and rating.json()["rating"] == 5)
        summary = client.get(f"/api/posts/{post_id}/ratings/summary")
        check(
            "rating summary",
            summary.status_code == 200
            and summary.json() == {"average_rating": 5.0, "rating_count": 1},
        )
        my_rating = client.get(f"/api/posts/{post_id}/rating", headers=auth(bob_token))
        check("my rating", my_rating.status_code == 200 and my_rating.json()["rating"] == 5)

        repost = client.post(
            f"/api/posts/{post_id}/repost",
            json={"content": "listen to this"},
            headers=auth(bob_token),
        )
        check("repost", repost.status_code == 201 and repost.json()["original_post_id"] == post_id)

        feed = client.get("/api/posts")
        check("feed", feed.status_code == 200 and len(feed.json()) == 2)

        # ------------------------------------------------------- notifications
        notifications = client.get("/api/notifications", headers=auth(alice_token))
        check(
            "list notifications",
            notifications.status_code == 200 and len(notifications.json()) > 0,
        )
        unread = client.get("/api/notifications/unread-count", headers=auth(alice_token))
        check("unread count", unread.status_code == 200 and unread.json()["count"] > 0)

        first_notification = notifications.json()[0]["id"]
        mark = client.post(
            f"/api/notifications/{first_notification}/read",
            headers=auth(alice_token),
        )
        check("mark notification read", mark.status_code == 200 and mark.json()["status"] == "read")
        read_all = client.post("/api/notifications/read-all", headers=auth(alice_token))
        check("mark all read", read_all.status_code == 200)
        unread_after = client.get(
            "/api/notifications/unread-count", headers=auth(alice_token)
        )
        check("unread count cleared", unread_after.json()["count"] == 0)

        notification_items = client.get("/api/notifications", headers=auth(alice_token))
        target_notification = notification_items.json()[0]["id"]
        patched = client.patch(
            f"/api/notifications/{target_notification}",
            json={"status": "unread"},
            headers=auth(alice_token),
        )
        check("patch notification", patched.status_code == 200)
        deleted_notification = client.delete(
            f"/api/notifications/{target_notification}", headers=auth(alice_token)
        )
        check("delete notification", deleted_notification.status_code == 204)

        # ----------------------------------------------------------- hashtags
        blocked_tag = client.post(
            "/api/hashtags",
            json={"tag": "blocked"},
            headers=auth(bob_token),
        )
        check("non-admin cannot create hashtag", blocked_tag.status_code == 403)
        tag = client.post(
            "/api/hashtags",
            json={"tag": "#Music", "usage": 3},
            headers=auth(admin_token),
        )
        check("admin creates hashtag", tag.status_code == 201 and tag.json()["tag"] == "music")
        trending = client.get("/api/hashtags/trending")
        check("trending hashtags", trending.status_code == 200 and len(trending.json()) == 1)
        fetched_tag = client.get("/api/hashtags/music")
        check("get hashtag", fetched_tag.status_code == 200)
        tag_update = client.patch(
            "/api/hashtags/music",
            json={"usage": 10},
            headers=auth(admin_token),
        )
        check("update hashtag", tag_update.status_code == 200 and tag_update.json()["usage"] == 10)
        tag_delete = client.delete("/api/hashtags/music", headers=auth(admin_token))
        check("delete hashtag", tag_delete.status_code == 204)

        # ------------------------------------------------------------- delete
        delete_post = client.delete(f"/api/posts/{post_id}", headers=auth(alice_token))
        check("delete post", delete_post.status_code == 204)
        delete_playlist = client.delete(
            f"/api/playlists/{playlist_id}", headers=auth(alice_token)
        )
        check("delete playlist", delete_playlist.status_code == 204)
        delete_track = client.delete(f"/api/tracks/{track_id}", headers=auth(alice_token))
        check("delete track", delete_track.status_code == 204)
        delete_album = client.delete(f"/api/albums/{album_id}", headers=auth(alice_token))
        check("delete album", delete_album.status_code == 204)

        # -------------------------------------------------------------- logout
        logout = client.post("/api/auth/logout", headers=auth(alice_token))
        check("logout", logout.status_code == 204)
        after_logout = client.get("/api/auth/me", headers=auth(alice_token))
        check("token blacklisted", after_logout.status_code == 401)

        # -------------------------------------------------------- rate limiting
        if settings.rate_limit_enabled:
            statuses = [
                client.post(
                    "/api/auth/login",
                    json={"email": "nobody@example.com", "password": "wrong-password"},
                ).status_code
                for _ in range(15)
            ]
            check("auth rate limit returns 429", 429 in statuses, str(statuses))


if __name__ == "__main__":
    print("=" * 64)
    print("End-to-end API test (in-memory SQLite)")
    print("=" * 64)
    try:
        run()
    except AssertionError as exc:
        print(f"\nFAILED: {exc}")
        raise SystemExit(1) from exc
    print("=" * 64)
    print("All API checks passed.")
    print("=" * 64)
