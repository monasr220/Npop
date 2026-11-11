# Security

This document describes the controls implemented in the codebase and the
operational steps required before a production deployment.

## Authentication

### Password storage

- Passwords are hashed with **Argon2id** (`argon2-cffi`) using a per-password
  salt and the library's recommended parameters.
- Legacy `scrypt$...` hashes remain verifiable for existing accounts. On a
  successful login with a legacy hash, the password is transparently rehashed
  with Argon2id.
- Plain-text passwords are never stored, logged or returned. `UserRead` returns
  account data without the hash.

### Tokens

- JWTs are signed with HS256 and `SECRET_KEY`.
- Each token has a unique `jti`, an expiry (`ACCESS_TOKEN_EXPIRE_MINUTES`,
  default 60) and is persisted in `access_token`.
- Logout marks the token blacklisted; `get_current_user` rejects blacklisted
  tokens. Password and account deletion flows revoke outstanding tokens.
- The frontend stores the token in `localStorage` (`npop_token`). This is a
  deliberate trade-off for a bearer-token SPA; the API does not accept cookies,
  so CSRF via cookies is not possible. XSS is mitigated with CSP and React's
  escaping (see below).

## Authorization

Authorization is enforced **server-side in the service layer**, not by hiding UI:

- Owner-only mutations use the authenticated user ID; a body cannot override it.
- Artist operations require an artist profile and check ownership of the album
  or track.
- Admin operations check `role == admin`: artist verification, role changes,
  deleting other users, hashtag CRUD.
- Admins cannot change their own role or delete their own account.
- Self-registration always creates `role=user`; role escalation through profile
  updates is ignored.

## Rate limiting

SlowAPI applies:

- a global default (`300/minute` per client IP),
- stricter limits on register/login (`10/minute`),
- stricter limits on uploads (`30/minute`).

Limits are configurable and return HTTP `429`. Storage is in-memory by default;
use Redis (`RATE_LIMIT_STORAGE_URI=redis://...`) when running multiple workers or
instances.

## Input and upload validation

- Pydantic schemas bound string lengths, numeric ranges and required fields.
- Owner and role fields are not accepted from request bodies for mutations that
  derive them from the token.
- Uploads are validated before reaching Cloudinary:
  - size caps (`MAX_AUDIO_UPLOAD_MB`, `MAX_IMAGE_UPLOAD_MB`) → HTTP 413,
  - content-type and extension allow-lists → HTTP 400,
  - magic-byte sniffing so a renamed executable cannot masquerade as media,
  - audio/image mismatch rejection.
- Hosted media URLs and social links must be `http(s)`; `javascript:`, `data:`
  and other schemes are rejected.
- Missing Cloudinary credentials return HTTP 503 instead of a stack trace.

## XSS and content security

- React escapes interpolated text by default; the app does not use
  `dangerouslySetInnerHTML`.
- The API serves a restrictive `Content-Security-Policy`:
  - `default-src 'self'`
  - `script-src 'self'` (no inline or third-party scripts)
  - `style-src 'self' 'unsafe-inline'` (dynamic progress widths and CSS
    variables)
  - `img-src`/`media-src` allow `https:` for hosted media
  - `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`
- `/docs`, `/redoc` and `/openapi.json` are exempt from CSP because Swagger UI
  loads assets from a CDN; these pages contain no user data.

## HTTP security headers

Every response includes:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Cross-Origin-Opener-Policy: same-origin`
- `Permissions-Policy` disabling camera, microphone, geolocation and payment
- `Content-Security-Policy` (except documentation paths)
- `Strict-Transport-Security` in production

## CORS

- CORS is an explicit allow-list from `CORS_ORIGINS`.
- In production the default is **empty**, which means same-origin only.
- In development, localhost and Vite origins are allowed automatically.
- `allow_credentials=True` is used, but the API authenticates with bearer tokens.

## Secrets and configuration

- `SECRET_KEY` must be a random value of at least 32 characters in production;
  the app raises on startup otherwise.
- In development a weak/missing key is replaced with an ephemeral random key and
  a warning is logged. Tokens do not survive a restart in that mode.
- `DEBUG` must be `false` when `ENVIRONMENT=production`.
- `.env` files are git-ignored. `.env.example` documents every setting without
  real credentials.

## Logging

- Logs are structured JSON by default (`LOG_JSON=true`), one object per line.
- Each request logs method, path, status, duration, client IP and a request id
  (`X-Request-ID` is also returned to the client).
- Passwords, tokens and secrets are never logged. Query strings are logged, so
  secrets must not be placed in query parameters.

## Production checklist

- [ ] Set a strong `SECRET_KEY` (48+ random characters).
- [ ] Set `ENVIRONMENT=production` and `DEBUG=false`.
- [ ] Serve over HTTPS; confirm HSTS.
- [ ] Set `CORS_ORIGINS` only if a separate origin is genuinely required.
- [ ] Use PostgreSQL or a backed-up SQLite path for `DATABASE_URL`.
- [ ] Configure Cloudinary (or another media host) and keep credentials secret.
- [ ] Use Redis for rate-limit storage if running multiple workers.
- [ ] Ship logs to a retention-managed store; define `LOG RETENTION PERIOD`.
- [ ] Run `uv run python scripts/check_api.py`, ruff and the frontend build.
- [ ] Complete and legally review the privacy policy and terms of service.
- [ ] Back up `app.db` (or the production database) and test restore.
- [ ] Never modify `new.db`.

## Reporting a vulnerability

Contact the address that will replace `[SECURITY CONTACT EMAIL]` in the legal
pages. Do not open a public issue for an unpatched vulnerability.
