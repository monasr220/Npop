# Npop

Npop is a music discovery, publishing and social platform. Listeners browse
artists, albums and tracks, build playlists, follow people and post to a feed.
Artists publish releases from a studio area, and admins moderate the platform.
A FastAPI backend serves both the JSON API and the production React app from a
single origin.

> **Status:** version 0.1, a working application suitable for local development
> and evaluation. It has not been through an external security audit or a
> production deployment. See [Known limitations](#known-limitations).

## Features

**Listeners**
- Registration and login, discovery home, global search, and a social feed
- Tracks, artists, albums and playlists; favourites; listening history
- Profiles with follow/unfollow, pinned tracks, profile picture, cover photo and
  social links
- Posts with comments, likes, star ratings and reposts, plus hashtags
- Notifications with a live unread badge (Server-Sent Events)

**Artists**
- Create an artist profile from Settings (promotes the account to `artist`)
- Studio dashboard, releases, album covers and track upload, either as a file
  (via Cloudinary) or as a hosted `http(s)` URL

**Admins**
- Verify artists, change user roles, delete other users, manage hashtags

**Player**
- Persistent player bar with a queue, shuffle, repeat (off/all/one), play next,
  add to queue, and a 10-band Web Audio equalizer with presets
- Dark and light themes

**Legal pages:** `/privacy-policy` and `/terms-of-service` are served by the app.
They are drafts with placeholders and need legal review before any real launch.

## Technology stack

| Layer | Technology |
| --- | --- |
| Backend | Python 3.14+, FastAPI, Uvicorn, SQLAlchemy 2, Pydantic 2 / pydantic-settings |
| Auth and security | PyJWT (HS256), argon2-cffi (Argon2id), SlowAPI |
| Database | SQLite by default (`app.db`); `DATABASE_URL` accepts other SQLAlchemy URLs, and `psycopg` is installed for PostgreSQL |
| Media storage | Cloudinary (optional, only needed for file uploads) |
| Frontend | React 18, TypeScript, Vite 6, React Router 6, Axios, Tailwind CSS 3, lucide-react |
| Tooling | [uv](https://docs.astral.sh/uv/) for Python, npm for the frontend, ESLint |

## Architecture

In normal use there is **one server process**. FastAPI exposes the API under
`/api` and also serves the compiled React build from `Frontend/dist`, with an
SPA fallback so client-side routes survive a page refresh.

```mermaid
flowchart LR
    Browser["Browser<br/>React SPA"]
    subgraph FastAPI["FastAPI (app/main.py)"]
        MW["Middleware<br/>CORS, rate limit,<br/>security headers, request logging"]
        API["Routers<br/>app/api"]
        SVC["Services<br/>app/services"]
        ORM["SQLAlchemy models<br/>app/models"]
        SPA["Static serving<br/>Frontend/dist + SPA fallback"]
    end
    DB[("SQLite app.db<br/>or DATABASE_URL")]
    CLD["Cloudinary<br/>(file uploads)"]

    Browser -- "HTML, JS, CSS" --> SPA
    Browser -- "JSON /api<br/>Bearer token" --> MW --> API --> SVC --> ORM --> DB
    SVC -- "validated uploads" --> CLD
    API -. "SSE /api/notifications/stream" .-> Browser
```

### Backend layers

| Layer | Path | Responsibility |
| --- | --- | --- |
| Routers | `app/api/` | Parse requests, resolve the current user, return Pydantic models |
| Schemas | `app/schemas/` | Validation and serialization |
| Services | `app/services/` | Business rules, ownership and role checks |
| Models | `app/models/` | SQLAlchemy ORM mappings (20 tables) |
| Core | `app/core/` | Settings, password hashing and JWT, rate limiter, logging |
| Utils | `app/utils/` | Upload and URL validation, pagination, CRUD helpers |

Authorization is enforced in the service layer using the user resolved from the
token, not from IDs in request bodies. More detail is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Frontend and backend integration

- The React app calls `/api` on its own origin through a single Axios client
  (`Frontend/src/services/api.ts`). In production no CORS setup is needed.
- After login or registration the token is stored in `localStorage`
  (`npop_token`) and attached as `Authorization: Bearer <token>`. A `401`
  response clears the token and emits an `npop:unauthorized` event.
- `AuthContext` exposes the current user and role flags. Route guards in
  `App.tsx` gate the artist studio and admin pages in the UI, but the backend
  independently enforces the same rules.
- Live notifications use `fetch` to read the SSE stream (the browser
  `EventSource` API cannot send an `Authorization` header), with a 60-second
  poll as a fallback.
- In development, `scripts/dev.py --vite` runs Vite on port 5173 and proxies
  `/api` to the backend on port 5001.

## Project structure

```
app/
  api/            HTTP routers (auth, users, artists, albums, tracks,
                  playlists, posts, hashtags, notifications)
  core/           config, security (Argon2id, JWT), limiter, logging
  db/             engine, session, declarative base
  models/         SQLAlchemy models
  schemas/        Pydantic request/response models
  services/       business logic and authorization
  utils/          upload/URL validation, pagination, CRUD helpers
  main.py         app factory, middleware, SPA serving
Frontend/
  src/            React + TypeScript source (pages, components, context, services)
  static/         legacy no-build UI, used only if Frontend/dist is missing
  dist/           production build (generated, git-ignored)
scripts/          dev launcher, DB helpers, verification scripts
docs/             architecture, API, database, security, development, legal drafts
main.py           alternative launcher (uv run main.py)
.env.example      documented configuration
```

## Getting started

**Prerequisites:** [uv](https://docs.astral.sh/uv/), Python 3.14+ (uv can fetch
it), and Node.js 20+ with npm.

```bash
git clone https://github.com/monasr220/Npop.git
cd Npop

uv sync                                   # backend dependencies
cd Frontend && npm install && npm run build && cd ..   # build the React app
cp .env.example .env                      # optional for local development

uv run python scripts/dev.py              # start everything on one port
```

Open <http://127.0.0.1:5001/>. Swagger UI is at
<http://127.0.0.1:5001/docs> and a liveness check is at `/health`.

Other ways to run:

```bash
uv run python scripts/dev.py --reload     # auto-reload on Python changes
uv run python scripts/dev.py --port 8000  # different backend port
uv run python scripts/dev.py --vite       # also start Vite (HMR) on :5173
uv run uvicorn app.main:app --reload --port 5001
uv run main.py
```

If `Frontend/dist` does not exist, the backend falls back to the legacy UI in
`Frontend/static`. Run `npm run build` to get the real application.

The database tables are created automatically on startup (`create_all`).
There is no migration tool yet. `app.db` is the working database. `new.db` is
legacy seed data: do not modify it and do not point `DATABASE_URL` at it.

## Environment variables

Settings are read by `app/core/config.py` from the process environment or from
`.env` (project root or `app/.env`). Copy `.env.example` and adjust. Never commit
a real `.env`; it is git-ignored.

| Variable | Default | Purpose |
| --- | --- | --- |
| `ENVIRONMENT` | `development` | `development`, `staging` or `production`. Production enables stricter checks and HSTS |
| `DEBUG` | `false` | Must be `false` when `ENVIRONMENT=production` |
| `SERVER_HOST` / `SERVER_PORT` | `127.0.0.1` / `5001` | Bind settings (`main.py` uses the port; `scripts/dev.py` sets it from `--port`) |
| `DATABASE_URL` | `sqlite:///<repo>/app.db` | SQLAlchemy URL, e.g. `postgresql+psycopg://user:password@localhost:5432/npop` |
| `SECRET_KEY` | empty | JWT signing key. Missing or weak (under 32 characters) is replaced with an ephemeral key in development and **rejected in production** |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Token lifetime |
| `CORS_ORIGINS` | empty | Comma-separated allow-list. Empty means same-origin only in production; localhost and Vite origins are allowed in development |
| `RATE_LIMIT_ENABLED` | `true` | Toggle rate limiting |
| `RATE_LIMIT_DEFAULT` | `300/minute` | Default per-IP limit |
| `RATE_LIMIT_AUTH` | `10/minute` | Register and login |
| `RATE_LIMIT_UPLOAD` | `30/minute` | Upload endpoints |
| `RATE_LIMIT_STORAGE_URI` | `memory://` | Use `redis://host:6379` for multiple workers |
| `MAX_AUDIO_UPLOAD_MB` / `MAX_IMAGE_UPLOAD_MB` | `50` / `10` | Upload size caps |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | empty | Needed only for file uploads. Without them uploads return `503`; hosted URLs still work |
| `LOG_LEVEL` / `LOG_JSON` | `INFO` / `true` | Log verbosity and JSON vs. human-readable output |

Example `.env` for local development:

```dotenv
ENVIRONMENT=development
SECRET_KEY=replace-with-output-of-the-command-below
```

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

## API

All endpoints live under `/api`. Authenticated requests send
`Authorization: Bearer <access_token>`. Errors use `{"detail": "..."}`.

| Group | Prefix | Covers |
| --- | --- | --- |
| Auth | `/api/auth` | `register`, `login`, `logout`, `me` |
| Users | `/api/users` | profiles, follow graph, favourites, history, pinned tracks, pictures, social links |
| Artists | `/api/artists` | list, create profile, `me`, update, verify (admin), albums, tracks |
| Albums | `/api/albums` | CRUD, cover upload, tracks |
| Tracks | `/api/tracks` | list, most played, upload (file or `/hosted` URL), play count |
| Playlists | `/api/playlists` | CRUD, track add/remove/reorder, artists |
| Posts | `/api/posts` | feed, CRUD, likes, comments, ratings, reposts |
| Hashtags | `/api/hashtags` | list, trending, admin CRUD |
| Notifications | `/api/notifications` | list, unread count, read, read-all, `stream` (SSE) |

Interactive documentation is generated by FastAPI at `/docs` and `/redoc`. The
full reference, including auth requirements per endpoint, is in
[docs/API.md](docs/API.md).

## Security

The following controls are implemented in the code:

- **Passwords:** hashed with Argon2id (64 MiB, 3 iterations, 4 lanes). Legacy
  `scrypt` hashes still verify and are upgraded to Argon2id on login.
- **Sessions:** signed JWTs with an expiry. Every issued token is stored
  server-side; logout blacklists the user's stored tokens, and requests with a
  blacklisted or unknown token are rejected.
- **Authorization:** checked in the service layer. Self-registration always
  creates a `user`; role changes, artist verification, hashtag management and
  deleting other accounts are admin-only; admins cannot change their own role
  or delete themselves; artists can only modify their own releases.
- **Rate limiting:** SlowAPI, per client IP, returning HTTP `429`. Stricter
  limits apply to register/login and uploads.
- **Input validation:** Pydantic bounds on lengths and ranges; password minimum
  of 8 characters; media and social-link URLs must be `http(s)`.
- **Upload validation:** size caps (HTTP `413`), content-type and extension
  allow-lists, and magic-byte checks so a renamed file cannot pass as media.
- **Headers:** `Content-Security-Policy` (`script-src 'self'`,
  `object-src 'none'`, `frame-ancestors 'none'`), `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`,
  `Permissions-Policy`, and HSTS when `ENVIRONMENT=production`. Swagger/ReDoc
  paths are exempt from the CSP.
- **CORS:** explicit allow-list, same-origin only in production by default.
- **Secrets and config:** the app refuses to start in production with a weak
  `SECRET_KEY` or with `DEBUG` enabled.
- **Logging:** structured JSON request logs with request IDs; passwords and
  tokens are not logged.

See [docs/SECURITY.md](docs/SECURITY.md) for the production checklist.

## Known limitations

- The bearer token is kept in `localStorage`, a deliberate trade-off documented
  in `docs/SECURITY.md`; it is readable by any script that runs on the page.
- The CSP allows inline styles (`style-src 'unsafe-inline'`).
- Rate-limit state is in memory by default and is per process.
- There is no database migration tool; schema changes rely on `create_all`.
- Automated checks are the verification scripts below plus the frontend
  type-check and lint. There is no unit-test framework or CI configuration.
- Uploading files needs a Cloudinary account; PostgreSQL is supported through
  `DATABASE_URL` but the bundled checks run against SQLite.
- The privacy policy and terms of service are drafts.

## Verification

```bash
uv run python scripts/check_models.py     # ORM and tables
uv run python scripts/check_schemas.py    # Pydantic schemas
uv run python scripts/check_services.py   # service layer
uv run python scripts/check_api.py        # end-to-end API (in-memory DB)

cd Frontend && npm run build && npm run lint
```

`check_api.py` uses an in-memory SQLite database and never touches `app.db`.
It requires the frontend to be built first, because it also asserts that the
React build and SPA fallback are served.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API.md)
- [Database](docs/DATABASE.md)
- [Security](docs/SECURITY.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Changelog](docs/CHANGELOG.md)
- [Privacy policy (draft)](docs/PRIVACY_POLICY.md) and
  [Terms of service (draft)](docs/TERMS_OF_SERVICE.md)

## Contributing

Issues and pull requests are welcome.

1. Fork the repository and create a branch for your change.
2. Set up locally as described in [Getting started](#getting-started).
3. Keep routers thin: put business rules and authorization in `app/services/`.
4. Before opening a pull request, run the four `check_*.py` scripts and
   `npm run build && npm run lint` in `Frontend/`, and update the docs if
   behaviour changes.
5. Do not commit secrets or `.env` files. Report security issues privately
   rather than in a public issue.

## License

Released under the [MIT License](LICENSE).
