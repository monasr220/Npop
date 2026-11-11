# Database

Npop uses SQLAlchemy 2.x with SQLite by default (`app.db`). The schema is created
with `Base.metadata.create_all()` on startup; there is no migration tool yet.

> **Legacy data:** `new.db` is read-only seed data used to derive the initial
> schema. It must never be modified. All application reads and writes go to
> `app.db`. Do not set `DATABASE_URL` to `new.db`.

## Identifiers and timestamps

- Primary keys are UUID strings (`id`, 36 characters).
- Every table has `created_at`.
- Mutable tables add `updated_at` where relevant (`user`, `post`,
  `post_comment`, `profile_picture`, `cover_photo`).
- Foreign keys reference `user.id`, `artist.id`, `album.id`, `track.id`,
  `playlist.id` or `post.id` as appropriate.

## Tables

### Identity and access

| Table | Key columns | Notes |
| --- | --- | --- |
| `user` | `username` (unique), `email` (unique), `password`, `bio`, `contact_info`, `role`, `last_login` | `role` is `user`, `artist` or `admin`. Passwords are hashes only. |
| `access_token` | `user_id`, `token` (unique), `expiry_time`, `blacklisted` | One row per issued JWT. Logout flips `blacklisted`. |
| `user_interaction` | `follower_id`, `followed_id` | Follow graph; unique pair. |

### Artist and catalogue

| Table | Key columns | Notes |
| --- | --- | --- |
| `artists` | `user_id` (unique), `name`, `bio`, `image_url`, `monthly_listeners`, `accent`, `verified`, `verified_at` | One artist profile per user. Only admins verify. |
| `albums` | `title`, `artist_id`, `cover_url`, `release_year`, `kind` | `kind` distinguishes album/single/EP. |
| `tracks` | `title`, `album_id`, `artist_id`, `duration`, `audio_url`, `track_number`, `explicit`, `plays` | Audio is a hosted URL (Cloudinary or external). |

### Listening and library

| Table | Key columns | Notes |
| --- | --- | --- |
| `playlists` | `name`, `description`, `cover_url`, `owner_id`, `is_system` | User-owned; system playlists are reserved. |
| `playlist_tracks` | `playlist_id`, `track_id`, `position`, `added_at` | Ordered join table. |
| `play_history` | `user_id`, `track_id`, `played_at` | Append-only listening history. |
| `favorite_track` | `user_id`, `track_id` | Unique pair. |
| `profile_track` | `user_id`, `track_id`, `position` | Pinned tracks on a profile. |
| `profile_picture` | `user_id`, `image`, `updated_at` | Historical profile images. |
| `cover_photo` | `user_id`, `image`, `updated_at` | Historical banner images. |
| `social_link` | `user_id`, `link` | Validated `http(s)` URLs. |

### Social

| Table | Key columns | Notes |
| --- | --- | --- |
| `post` | `user_id`, `content`, `image`, `video`, `track_id`, `original_post_id`, `updated_at` | Reposts reference `original_post_id`. |
| `post_comment` | `user_id`, `post_id`, `comment`, `updated_at` | |
| `like` | `user_id`, `post_id`, `liked` | Boolean row per user/post. |
| `post_rating` | `user_id`, `post_id`, `rating` | 1–5, unique per user/post. |
| `hashtag` | `tag` (unique), `usage` | Normalized lowercase without `#`. |
| `notification` | `user_id`, `message`, `status` | `status` is `read` or `unread`. |

## Relationships (summary)

```
user 1─1 artist
user 1─N access_token, playlist, post, post_comment, like, post_rating,
          favorite_track, profile_track, profile_picture, cover_photo,
          social_link, play_history, notification
user N─N user          (user_interaction: followers/following)

artist 1─N album, track
album  1─N track
playlist 1─N playlist_tracks N─1 track
post   1─N post_comment, like, post_rating
post   1─1 track (optional attachment)
post   1─N post (reposts via original_post_id)
```

## Deletion behaviour

Deletes are performed by the services. Account deletion removes the user's
profile data and owned content. Artist content is removed with the artist
profile. Posts referencing a deleted track lose the attachment rather than the
whole post where the model permits it.

## Inspecting the database

```bash
uv run python -c "
import sqlite3
con = sqlite3.connect('app.db')
print([r[0] for r in con.execute(\"select name from sqlite_master where type='table' order by name\")])
"
```

`scripts/check_models.py` asserts that all models register and that the expected
tables exist. `scripts/check_api.py` runs against an in-memory database and never
touches `app.db`.
