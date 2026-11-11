# Npop documentation

Npop is a music discovery, publishing and social platform. A FastAPI backend
serves both the JSON API and the production React single-page app from one
origin.

## Start here

```bash
# 1. Install Python dependencies
uv sync

# 2. Optional: copy configuration and adjust it
cp .env.example .env

# 3. Build the React frontend (once, or after frontend changes)
cd Frontend && npm install && npm run build && cd ..

# 4. Run everything on one port
uv run python scripts/dev.py
```

Open <http://127.0.0.1:5001/>. API documentation is at
<http://127.0.0.1:5001/docs>.

## Documentation map

| Document | What it covers |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Backend layers, request flow, frontend structure, player, roles |
| [API.md](API.md) | Authentication, conventions, every endpoint group, errors and rate limits |
| [DATABASE.md](DATABASE.md) | Tables, relationships, identifiers, timestamps, legacy `new.db` |
| [SECURITY.md](SECURITY.md) | Password hashing, tokens, authorization, uploads, headers, production checklist |
| [PRIVACY_POLICY.md](PRIVACY_POLICY.md) | Draft privacy policy (placeholders must be completed) |
| [TERMS_OF_SERVICE.md](TERMS_OF_SERVICE.md) | Draft terms of service (placeholders must be completed) |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Local setup, scripts, verification, troubleshooting |
| [CHANGELOG.md](CHANGELOG.md) | Notable changes |

## Repository layout

```
app/                  FastAPI application
  api/                HTTP routers (thin; call services)
  core/               Settings, security, limiter, logging
  db/                 Engine, session, declarative base
  models/             SQLAlchemy models (one file per table group)
  schemas/            Pydantic request/response models
  services/           Business logic and authorization
  utils/              Storage, pagination, CRUD helpers
Frontend/             React + TypeScript + Vite app
  src/                Application source
  dist/               Production build served by FastAPI
  static/             Legacy no-build SPA (fallback only)
scripts/              Development launcher and verification scripts
docs/                 This documentation
```

## Legal pages

The application serves `/privacy-policy` and `/terms-of-service` from the React
router. The same drafts are mirrored in this folder. Both are **drafts** that
describe how the code actually handles data; company identity, contact details,
retention periods and governing law are placeholders and must be completed and
reviewed by qualified counsel before launch.
