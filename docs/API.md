# API reference

Base URL: `http://127.0.0.1:5001/api`

Interactive documentation: `/docs` (Swagger UI) and `/redoc`. The OpenAPI
document is available at `/openapi.json`.

## Conventions

- JSON request and response bodies unless noted (uploads use `multipart/form-data`).
- Timestamps are ISO 8601 UTC strings.
- IDs are UUID strings.
- Errors use FastAPI's shape: `{"detail": "..."}`. Validation errors use `422`
  with a list of field errors.
- Owner-only mutations derive the owner from the bearer token. Sending another
  user's ID in a body cannot transfer ownership.

## Authentication

Send the token from register/login on every authenticated request:

```
Authorization: Bearer <access_token>
```

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | — | Creates a listener (`role=user`). Returns a token. Rate-limited. |
| POST | `/auth/login` | — | Returns a token. Rate-limited. |
| POST | `/auth/logout` | user | Blacklists the current token. |
| GET | `/auth/me` | user | Returns the full private profile. |

`UserRead` includes `email`; `UserPublic` (used in posts, comments, followers)
does not.

## Users and profiles

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/users` | — | List public profiles. |
| GET | `/users/{user_id}` | — | Public profile. |
| PATCH | `/users/{user_id}` | owner/admin | Update profile. Role changes are admin-only; admins cannot change their own role. |
| DELETE | `/users/{user_id}` | owner/admin | Delete account. Admins cannot delete themselves. |
| GET | `/users/{user_id}/music` | — | Bundle: profile tracks, favourites, recent plays, most played, playlists. |
| GET | `/users/{user_id}/favorites` | — | Favourite tracks. |
| POST/DELETE | `/users/{user_id}/favorites/{track_id}` | owner | Add/remove a favourite. |
| GET | `/users/{user_id}/history` | — | Play history. |
| GET | `/users/{user_id}/recently-played` | — | Recent tracks. |
| GET | `/users/{user_id}/most-played` | — | Most-played tracks. |
| GET | `/users/{user_id}/profile-tracks` | — | Pinned tracks. |
| POST | `/users/{user_id}/profile-tracks` | owner | Pin a track (`{"track_id": "..."}`). |
| DELETE | `/users/{user_id}/profile-tracks/{track_id}` | owner | Unpin. |
| PATCH | `/users/{user_id}/profile-tracks/reorder` | owner | `{"track_ids": [...]}`. |
| POST | `/users/{user_id}/profile-picture` | owner | JSON `image_url` or multipart image. |
| GET | `/users/{user_id}/profile-pictures` | — | History of profile pictures. |
| POST | `/users/{user_id}/cover-photo` | owner | JSON `image_url` or multipart image. |
| GET | `/users/{user_id}/cover-photos` | — | History of cover photos. |
| GET/PUT | `/users/{user_id}/social-links` | owner for PUT | Replace the link list (`{"links": ["https://..."]}`). |
| POST/DELETE | `/users/{user_id}/follow` | user | Follow/unfollow. |
| GET | `/users/{user_id}/followers` | — | Followers. |
| GET | `/users/{user_id}/followings` | — | Following. |
| GET | `/users/{user_id}/follow-counts` | — | `{followers, followings}`. |
| GET | `/users/{user_id}/is-following/{target_id}` | — | `{following: bool}`. |

Social links must be `http(s)`; other schemes are rejected.

## Artists

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/artists` | — | List/search (`q`). |
| POST | `/artists` | user | Creates an artist profile and promotes the caller to `role=artist`. One per user. |
| GET | `/artists/me` | user | The caller's artist profile. |
| GET | `/artists/{artist_id}` | — | Artist detail. |
| PATCH | `/artists/{artist_id}` | owner/admin | Update name, bio, image, accent. |
| GET | `/artists/{artist_id}/albums` | — | Releases. |
| GET | `/artists/{artist_id}/tracks` | — | Tracks. |
| POST | `/artists/{artist_id}/verify` | admin | `{"verified": true}`. |

## Albums

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/albums` | — | List/search. |
| POST | `/albums` | artist | Artist is derived from the token. |
| GET | `/albums/{album_id}` | — | Detail with `tracks`. |
| PATCH/DELETE | `/albums/{album_id}` | owner/admin | Owner-only for artists. |
| GET | `/albums/{album_id}/tracks` | — | Album tracks. |
| POST | `/albums/{album_id}/cover` | owner | Multipart image or `cover_url`. Rate-limited. |

## Tracks

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/tracks` | — | Filters: `q`, `artist_id`, `album_id`, `skip`, `limit`. |
| GET | `/tracks/most-played` | — | Platform chart. |
| GET | `/tracks/{track_id}` | — | Detail. |
| POST | `/tracks/hosted` | artist | JSON upload with an already-hosted `audio_url`. Rate-limited. |
| POST | `/tracks` | artist | Multipart upload: `file` or `audio_url`. Rate-limited. |
| PATCH/DELETE | `/tracks/{track_id}` | owner/admin | Owner-only for artists. |
| POST | `/tracks/{track_id}/play` | optional | Increments plays; records history when authenticated. |

Track reads include nested `artist` and `album` summaries. Uploads require an
album owned by the caller's artist profile.

Upload validation rejects oversized files (413), wrong content types, wrong
extensions and files whose magic bytes do not match the declared media type
(400). Missing Cloudinary credentials return 503.

## Playlists

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/playlists` | — | List. |
| POST | `/playlists` | user | Owner derived from the token. |
| GET | `/playlists/{playlist_id}` | — | Detail with entries and nested tracks. |
| PATCH/DELETE | `/playlists/{playlist_id}` | owner/admin | Owner-only for users. |
| GET | `/playlists/{playlist_id}/artists` | — | Distinct artists in the playlist. |
| POST | `/playlists/{playlist_id}/tracks` | owner | `{"track_id": "..."}`. |
| DELETE | `/playlists/{playlist_id}/tracks/{track_id}` | owner | Remove a track. |
| PUT | `/playlists/{playlist_id}/tracks/reorder` | owner | `{"track_ids": [...]}`. |

## Posts, comments, likes and ratings

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/posts` | — | Feed. |
| POST | `/posts` | user | Text, image, video, optional `track_id`. |
| GET | `/posts/{post_id}` | — | Detail with comments and likes. |
| PATCH/DELETE | `/posts/{post_id}` | owner/admin | |
| GET/POST | `/posts/{post_id}/comments` | user for POST | |
| PATCH/DELETE | `/posts/{post_id}/comments/{comment_id}` | owner/admin | |
| POST/DELETE | `/posts/{post_id}/like` | user | Toggle-style like. |
| GET | `/posts/{post_id}/likes` | — | Likes. |
| POST | `/posts/{post_id}/repost` | user | Creates a repost referencing the original. |
| GET/POST | `/posts/{post_id}/rating` | user for POST/DELETE | 1–5 stars. |
| GET | `/posts/{post_id}/ratings` | — | All ratings. |
| GET | `/posts/{post_id}/ratings/summary` | — | `{average_rating, rating_count}`. |

`PostRead` includes nested `user`, `track`, `likes_count` and `comments_count`
so feeds render without per-post follow-up requests.

## Notifications

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/notifications` | user | List own notifications. |
| GET | `/notifications/unread-count` | user | `{count}`. |
| GET | `/notifications/stream` | user | Server-Sent Events stream. |
| POST | `/notifications/{id}/read` | user | Mark one read. |
| POST | `/notifications/read-all` | user | Mark all read. |
| PATCH | `/notifications/{id}` | user | Update status. |
| DELETE | `/notifications/{id}` | user | Delete. |

`EventSource` cannot send an `Authorization` header, so the frontend consumes
the stream with `fetch` and a bearer token.

## Hashtags

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/hashtags` | — | List. |
| POST | `/hashtags` | admin | Normalized (lowercase, no `#`). |
| GET | `/hashtags/trending` | — | Trending list. |
| GET/PATCH/DELETE | `/hashtags/{tag}` | admin for writes | |

## Health

`GET /health` returns `{"status": "ok"}` and is not under `/api`.

## Rate limits

Configured in `app/core/config.py`:

| Scope | Default |
| --- | --- |
| All requests | `300/minute` per client IP |
| Register/login | `10/minute` per client IP |
| Uploads (track/cover) | `30/minute` per client IP |

Exceeding a limit returns HTTP `429` with `{"error": "Rate limit exceeded: ..."}`.
Limits are configurable through `RATE_LIMIT_*` environment variables.

## Status codes

| Code | Meaning |
| --- | --- |
| 200 | OK |
| 201 | Created |
| 204 | No content (delete/logout/follow) |
| 400 | Invalid input, unsafe URL, bad upload |
| 401 | Missing, expired or blacklisted token |
| 403 | Authenticated but not allowed |
| 404 | Resource not found |
| 413 | Upload too large |
| 422 | Request body failed validation |
| 429 | Rate limit exceeded |
| 502/503 | Media storage failure or not configured |
