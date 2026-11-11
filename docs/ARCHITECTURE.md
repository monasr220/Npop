# Architecture

## Overview

Npop is a single-origin web application:

```
Browser
  │  HTML/CSS/JS from Frontend/dist
  │  JSON over /api, bearer token in Authorization header
  ▼
FastAPI (app/main.py)
  ├── /api/*        routers → services → SQLAlchemy → app.db
  ├── /docs         OpenAPI / Swagger UI
  ├── /health       liveness
  └── /assets/*     hashed React build assets
      /*            index.html (SPA fallback)
```

There is no separate frontend server in production. `Frontend/dist` is built
ahead of time and mounted by FastAPI. `Frontend/static` is retained as a
no-build fallback for checkouts that have not run `npm run build`.

## Backend layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| API | `app/api/` | Parse requests, declare dependencies, return Pydantic models. No business rules. |
| Schemas | `app/schemas/` | Validation, serialization, nested read shapes. |
| Services | `app/services/` | Business rules, ownership checks, transactions. |
| Models | `app/models/` | SQLAlchemy ORM mappings and constraints. |
| Core | `app/core/` | Settings, JWT/password security, rate limiter, structured logging. |
| Utils | `app/utils/` | Upload validation, URL validation, pagination, CRUD helpers. |
| DB | `app/db/` | Engine, session factory, declarative base. |

A typical request flows:

1. Middleware adds a request id, applies CORS and rate limits, and logs the
   response.
2. The router resolves `get_current_user` / `get_optional_user` from the bearer
   token.
3. The service performs authorization using IDs from the token, never from the
   request body.
4. SQLAlchemy reads or writes `app.db` inside a session dependency.
5. The router returns a schema; FastAPI serializes it.

## Authentication

- `POST /api/auth/register` creates a **listener** (`role=user`) and returns a
  token. Self-registration can never create an artist or admin.
- `POST /api/auth/login` verifies the password and returns a token.
- Tokens are JWTs signed with `SECRET_KEY` and include a unique `jti`.
- Every token is stored in `access_token`; logout sets `blacklisted=true`.
  `get_current_user` rejects blacklisted or expired tokens.
- `Authorization: Bearer <token>` is required for authenticated routes.
  Optional-auth routes (for example play counting) accept anonymous requests.

## Roles

| Capability | Listener (`user`) | Artist (`artist`) | Admin (`admin`) |
| --- | --- | --- | --- |
| Browse, play, favourite, playlist, post | yes | yes | yes |
| Create an artist profile | yes (promotes to artist) | — | yes |
| Upload albums/tracks, manage own releases | no | own only | via artist profile |
| Verify artists | no | no | yes |
| Change roles / delete other users | no | no | yes |
| Create/update/delete hashtags | no | no | yes |

Role changes and artist verification are admin-only. Admins cannot change their
own role or delete their own account.

## Frontend

The React app uses:

- **React Router** for client-side routes, including `/privacy-policy` and
  `/terms-of-service`.
- **Axios** with `baseURL: "/api"`; a `401` clears the token and emits
  `npop:unauthorized`.
- **AuthContext** exposing `user`, `artist`, `isArtist`, `isAdmin` and auth
  actions. `isArtist` means an artist profile exists, matching backend
  capability.
- **ThemeContext** for dark/light themes persisted in `npop_theme`.
- **Design tokens** in `src/index.css`, mapped through `tailwind.config.js`.
  The identity uses only Warm Beige `#E8DCC8`, Deep Red `#B3262D` and Matte
  Black `#171717`, with neutral shades for borders, muted text and surfaces.
  `--brand-solid`/`--brand-on` are the action fill and its foreground;
  `--brand-primary` is the theme-adjusted text/icon red.
- **ToastContext** for transient feedback.
- **PlayerContext** for the persistent audio player.

### Player

The enhanced player adds:

- A queue with a stable visible order and a separate play order for shuffle.
- Shuffle (persisted in `npop_shuffle`) and repeat off/all/one
  (`npop_repeat`).
- Play next, add to queue, remove from queue and clear upcoming.
- A 10-band Web Audio equalizer with presets, a response curve and headroom
  (`npop_eq`).

The equalizer needs CORS-enabled audio to route through Web Audio. Tracks hosted
on Cloudinary work. If a host blocks CORS, the player detects the failure,
retries the same track on a plain `<audio>` element, and marks the equalizer as
unavailable for that track instead of playing silence.

### Layout and pages

- `AppLayout` provides the sidebar/topbar shell, the persistent `PlayerBar` and
  the toast outlet.
- Listener navigation emphasizes discovery, feed, library, playlists and
  notifications.
- Artist navigation adds studio pages: artist dashboard, releases and track
  upload.
- Admin navigation adds the admin page for verification, roles, users and
  hashtags.

## Serving the SPA

`app/main.py`:

1. Registers `/api`, `/docs`, `/redoc`, `/openapi.json` and `/health` first.
2. Mounts `/assets` from the build directory when it exists.
3. Adds a catch-all `GET /{path}` that:
   - returns a JSON 404 for unknown `/api/*` paths,
   - serves real files from the build directory,
   - returns `index.html` for client-side routes,
   - returns a JSON 404 for missing files with an extension.

`Frontend/dist/index.html` is served with `Cache-Control: no-cache`; hashed
assets are served with `Cache-Control: public, max-age=31536000, immutable`.

## Configuration

All runtime configuration lives in `app/core/config.py` and is read from the
environment or `.env` files. See `.env.example`. Security-relevant defaults:

- Weak or missing `SECRET_KEY` is replaced by an ephemeral development key, and
  the app refuses to start that way when `ENVIRONMENT=production`.
- CORS is an explicit allow-list; production defaults to same-origin only.
- Rate limits and upload size caps are configurable.
