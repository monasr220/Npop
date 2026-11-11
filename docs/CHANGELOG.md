# Changelog

All notable changes to Npop. Dates use ISO 8601.

## [Unreleased]

### Added

- Production React + TypeScript frontend served by FastAPI from `Frontend/dist`
  with SPA fallback, hashed asset caching and a JSON 404 for unknown `/api`
  paths.
- Role-aware listener and artist experiences with distinct navigation,
  dashboards and workflows.
- Enhanced player: queue panel, shuffle, repeat off/all/one, play next, add to
  queue, remove/clear upcoming, and a 10-band Web Audio equalizer with presets.
- Pages for auth, discovery, feed, tracks, artists, albums, playlists, profiles,
  artist studio, notifications, search, settings, admin, privacy policy, terms of
  service and a 404 route.
- Dark and light themes built on three brand colors (Warm Beige, Deep Red,
  Matte Black) with WCAG-AA contrast and reduced-motion support.
- Argon2id password hashing with transparent legacy `scrypt` verification and
  rehash-on-login.
- SlowAPI rate limiting: global default, stricter auth and upload limits, HTTP
  429 responses.
- Upload validation (size, content type, extension, magic bytes) and `http(s)`
  URL validation for media and social links.
- Security headers and a restrictive Content-Security-Policy, with `/docs`
  exempted so Swagger UI keeps working.
- Structured JSON request logging with request ids and duration.
- Explicit CORS allow-list driven by settings.
- Configuration via `.env`, with `.env.example` documenting every setting.
- Documentation set in `docs/`: architecture, API, database, security,
  development, legal drafts and this changelog.
- Verification scripts for the API, services, models and schemas, plus frontend
  build and lint.

### Changed

- `app/main.py` now prefers the React build, mounts `/assets`, and preserves
  `/api`, `/docs`, `/redoc`, `/openapi.json` and `/health` priority.
- Self-registration always creates a listener; artist profiles and roles are
  granted through their dedicated flows.
- `UserPublic` omits email addresses.
- Track and post reads include nested summaries (`artist`, `album`, `user`,
  counts) to avoid per-item follow-up requests.
- Admin profile updates/deletes are allowed for other users, but admins cannot
  change their own role or delete their own account.
- API base path is `/api`; the production default port is 5001.
- Brand identity now uses Warm Beige `#E8DCC8`, Deep Red `#B3262D` and Matte
  Black `#171717` across both themes, with serif display type and brand-derived
  artwork placeholders.
- The production bundle is split into react, router, icons and vendor chunks,
  removing the single-chunk size warning and improving caching.

### Security

- Weak or missing `SECRET_KEY` is rejected in production and replaced with an
  ephemeral development key otherwise.
- `DEBUG` must be false in production.
- CORS defaults to same-origin in production.
- Logout and account deletion revoke tokens; blacklisted tokens are rejected.
- Owner-only mutations derive ownership from the token.

### Fixed

- Followers/following relationships and counts.
- Playlist reorder and track removal behaviour.
- Notification read/read-all and unread counts.
- API schema validation for nested reads.
- `.gitignore` merge-conflict markers removed.

## [1.0.0]

- Initial Npop backend: users, artists, albums, tracks, playlists, favourites,
  play history, posts, comments, likes, ratings, hashtags, notifications and
  follower graph.
- FastAPI routers, SQLAlchemy models, Pydantic schemas and service layer.
- JWT authentication and role-based access control.
- Legacy static SPA in `Frontend/static`.
- `new.db` retained as read-only seed data; `app.db` used for runtime.
