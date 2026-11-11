# Npop

A music discovery, publishing and social platform: artists, albums, tracks,
playlists, posts, notifications and a persistent enhanced player. FastAPI serves
both the JSON API and the production React app from one origin.

## Quick start

```bash
uv sync
cd Frontend && npm install && npm run build && cd ..
uv run python scripts/dev.py
```

Open <http://127.0.0.1:5001/>. Interactive API documentation:
<http://127.0.0.1:5001/docs>.

The backend and frontend are **not separate processes** in production.
`app/main.py` serves the React build from `Frontend/dist` at `/`, the JSON API at
`/api`, and uses an SPA fallback so client-side routes work on refresh.

### Configuration

Copy `.env.example` to `.env` and adjust as needed. All settings are documented
there. In development, a missing `SECRET_KEY` is replaced with an ephemeral key
(tokens then do not survive a restart). In production the app refuses to start
without a strong key.

### React/Vite development mode

For hot module replacement while working on the frontend:

```bash
uv run python scripts/dev.py --vite
```

This starts the backend on port 5001 and Vite on port 5173. Vite proxies `/api`
to the backend. Run `npm run build` in `Frontend/` before serving without Vite.

### Options

```bash
uv run python scripts/dev.py --port 8000   # different backend port
uv run python scripts/dev.py --reload      # auto-reload on Python changes
```

## Features

- **Listener experience:** discovery, feed, global search, tracks, artists,
  albums, playlists, profiles, favourites, listening history and notifications.
- **Artist experience:** artist profile, studio dashboard, releases, album covers
  and track uploads (file or hosted URL).
- **Admin experience:** artist verification, role changes, user management and
  hashtag management.
- **Player:** persistent queue, shuffle, repeat off/all/one, play next, add to
  queue, and a 10-band equalizer.
- **Themes:** coherent dark and light themes built on three brand colors, with
  WCAG-AA contrast and reduced-motion support.
- **Legal pages:** `/privacy-policy` and `/terms-of-service` (review drafts).

## Security

Argon2id password hashing, expiring JWT sessions with server-side revocation,
server-side authorization on every mutation, SlowAPI rate limiting with HTTP
429, upload validation (size, type, extension, magic bytes), `http(s)` URL
validation, an explicit CORS allow-list, security headers, a restrictive CSP and
structured JSON logging. See [docs/SECURITY.md](docs/SECURITY.md).

## Verify

```bash
uv run python scripts/check_api.py        # end-to-end API (in-memory DB)
uv run python scripts/check_services.py   # service layer
uv run python scripts/check_models.py     # ORM/tables
uv run python scripts/check_schemas.py    # Pydantic schemas

uv run ruff check .
uv run python -m compileall app scripts

cd Frontend && npm run build && npm run lint
```

`check_api.py` never touches `app.db`. `new.db` is legacy read-only seed data and
must never be modified.

## Documentation

Full documentation lives in [`docs/`](docs/README.md):

- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Database](docs/DATABASE.md)
- [Security](docs/SECURITY.md)
- [Development](docs/DEVELOPMENT.md)
- [Privacy Policy (draft)](docs/PRIVACY_POLICY.md)
- [Terms of Service (draft)](docs/TERMS_OF_SERVICE.md)
- [Changelog](docs/CHANGELOG.md)
