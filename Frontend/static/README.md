# Npop Frontend

A dependency-free single-page app served by the FastAPI backend.

## Run

From the project root:

```bash
uv run main.py
# or
uv run python scripts/dev.py
```

Then open <http://127.0.0.1:5001/>.

The API is mounted at `/api`, and `app/main.py` mounts this folder at `/`
with `StaticFiles(html=True)`, so `index.html`, `styles.css` and `app.js` are
served from the same origin (no CORS setup needed in the browser).

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Auth screen, app shell, navigation and audio player. |
| `styles.css` | Dark responsive layout, cards, forms and player. |
| `app.js` | All API calls and rendering. Token stored in `localStorage`. |

## Features

- Register / login / logout (JWT bearer tokens).
- Social feed: create posts, attach a song, like, comment, rate 1–5, repost,
  delete your own posts.
- Explore: search artists and tracks, open artist pages, albums and tracks.
- Playlists: create, view, add/remove tracks.
- Notifications: unread count, mark one/all as read.
- Profile: edit bio/contact, set a profile picture URL, become an artist,
  view favourites, pinned tracks, recently played and most played.
- Audio player: pressing **Play** registers a listen (`POST /tracks/{id}/play`)
  and streams `audio_url`.

## Notes

- Uploading real audio files and album covers uses Cloudinary and requires
  credentials in `app/.env` (or the project `.env`). The API also accepts
  already-hosted URLs, which is what this UI uses.
- The notification SSE stream (`GET /api/notifications/stream`) is available to
  API clients; the browser UI polls through normal REST requests because
  `EventSource` cannot send the `Authorization` header.
