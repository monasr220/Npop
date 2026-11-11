# Development

## Prerequisites

- Python 3.14+
- [uv](https://docs.astral.sh/uv/)
- Node.js 20+ and npm (frontend build only)

## First-time setup

```bash
uv sync

cd Frontend
npm install
npm run build
cd ..

cp .env.example .env   # optional; sensible development defaults are built in
```

Without `SECRET_KEY`, the backend generates an ephemeral key on startup. Tokens
are invalidated on restart, so set a real key if that is inconvenient.

## Running

### One command (recommended)

```bash
uv run python scripts/dev.py
```

This runs Uvicorn on `http://127.0.0.1:5001/`, serving both the API and the
production React build.

```bash
uv run python scripts/dev.py --reload        # auto-reload Python changes
uv run python scripts/dev.py --port 8000     # different port
uv run python scripts/dev.py --vite          # also start Vite on :5173
```

`--vite` is for frontend development with hot module replacement. Vite proxies
`/api` to `http://127.0.0.1:5001`. After changing frontend code and before
running without `--vite`, rebuild:

```bash
cd Frontend && npm run build
```

### Directly with Uvicorn

```bash
uv run uvicorn app.main:app --reload --port 5001
```

### Plain Python

```bash
uv run main.py
```

## Ports

| Service | URL |
| --- | --- |
| Application + API | <http://127.0.0.1:5001/> |
| Swagger UI | <http://127.0.0.1:5001/docs> |
| ReDoc | <http://127.0.0.1:5001/redoc> |
| Health | <http://127.0.0.1:5001/health> |
| Vite dev server (optional) | <http://127.0.0.1:5173/> |

The default matches the production URL in `goal.txt`. Use `--port` or
`SERVER_PORT` to run on another port; update the Vite proxy target in
`Frontend/vite.config.ts` if you change it for development.

## Verification

```bash
uv run python scripts/check_api.py        # end-to-end API (in-memory DB)
uv run python scripts/check_services.py   # service layer
uv run python scripts/check_models.py     # ORM/tables
uv run python scripts/check_schemas.py    # Pydantic schemas

uv run ruff check .
uv run python -m compileall app scripts
```

`check_api.py` uses an in-memory SQLite database and never touches `app.db`. It
also asserts that the React build is served, the SPA fallback works, security
headers are present and auth rate limiting returns HTTP 429.

Frontend checks:

```bash
cd Frontend
npm run build     # runs tsc && vite build
npm run lint
```

## Database

- `app.db` is the working database. It is created automatically on first run.
- `new.db` is legacy seed data. **Never modify it** and never point
  `DATABASE_URL` at it.
- Schema changes use `Base.metadata.create_all()`; there is no migration tool in
  this project yet.

## Frontend development notes

- TypeScript is strict and `noUnusedLocals` / `noUnusedParameters` are enabled.
- The build target is ES2020; avoid newer APIs such as `Array.prototype.at`.
- Brand colors are Warm Beige `#E8DCC8`, Deep Red `#B3262D` and Matte Black
  `#171717`. Tokens are CSS variables holding **RGB channel triples** so
  Tailwind opacity modifiers (`bg-brand-primary/10`) work.
- Use `bg-brand-solid` + `text-brand-on` for action fills, and
  `text-brand-primary` for red text/icons. Dark surfaces use a lifted red shade
  so text and icons keep WCAG-AA contrast.
- Design tokens live in `Frontend/src/index.css`; Tailwind mappings live in
  `Frontend/tailwind.config.js`.
- All themes support `prefers-reduced-motion`.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `/` shows the legacy UI | `Frontend/dist` is missing. Run `npm run build` in `Frontend/`. |
| 401 after a backend restart | Ephemeral `SECRET_KEY`; set one in `.env`. |
| Uploads return 503 | Cloudinary credentials are missing; use hosted URLs or configure them. |
| Rate limit 429 while testing | Wait for the window to expire, raise the limits in `.env`, or set `RATE_LIMIT_ENABLED=false` locally. |
| `npm run build` fails on `.at()` | Target is ES2020; use index arithmetic instead. |
| Vite can't reach the API | Start the backend on port 5001 or change the proxy in `Frontend/vite.config.ts`. |
