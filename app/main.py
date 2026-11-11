"""FastAPI application entrypoint.

Run with ``uv run uvicorn app.main:app --reload`` or simply ``uv run main.py``.

The JSON API lives under ``/api``.  The production React build in
``Frontend/dist`` is served from ``/`` so the whole project runs at one URL
without the Vite dev server.  ``Frontend/static`` remains as a fallback for
checkouts where the React app has not been built yet.

Routing priority (first match wins):

1. ``/api/*``  — JSON API
2. ``/docs``, ``/redoc``, ``/openapi.json`` — generated API documentation
3. ``/health`` — liveness probe
4. ``/assets/*`` and other real files — static build output
5. everything else — ``index.html`` (client-side routing fallback)
"""

from __future__ import annotations

import logging
import time
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

import app.models  # noqa: F401  (registers every table on Base.metadata)
from app.api import api_router
from app.core.config import PROJECT_DIR, settings
from app.core.limiter import limiter
from app.core.logging import configure_logging
from app.db.base import Base
from app.db.session import get_engine

DIST_DIR = PROJECT_DIR / "Frontend" / "dist"
STATIC_DIR = PROJECT_DIR / "Frontend" / "static"
INDEX_FILE = DIST_DIR / "index.html"

# Injected into every response.  The React app only needs inline styles for a
# few dynamic values (progress bars, CSS variables), so ``style-src`` keeps
# ``'unsafe-inline'`` while scripts stay locked to the built bundle.
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
}

CONTENT_SECURITY_POLICY = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob: https:; "
    "media-src 'self' blob: https:; "
    "font-src 'self' data:; "
    "connect-src 'self' https:; "
    "object-src 'none'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "frame-ancestors 'none'"
)

# Swagger UI and ReDoc load their assets from a CDN and use inline scripts, so
# the application CSP would break them.  They are documentation-only pages and
# never serve user data.
_CSP_EXEMPT_PATHS = {"/docs", "/redoc", "/openapi.json"}

configure_logging()
logger = logging.getLogger("app.request")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # The project uses a lightweight create_all setup instead of migrations.
    Base.metadata.create_all(bind=get_engine())
    logger.info(
        "application started",
        extra={"path": "/", "method": "STARTUP", "status": 0, "duration_ms": 0},
    )
    yield
    logger.info(
        "application stopped",
        extra={"path": "/", "method": "SHUTDOWN", "status": 0, "duration_ms": 0},
    )


app = FastAPI(
    title="Npop API",
    description="Music and social app: artists, albums, tracks, playlists and posts.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# SlowAPI needs the limiter on app.state so both the middleware and the
# ``@limiter.limit`` decorators resolve to the same storage.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    expose_headers=["X-Request-ID"],
    max_age=600,
)
app.add_middleware(SlowAPIMiddleware)


@app.middleware("http")
async def request_logging(request: Request, call_next):
    """Attach a request id, log one structured line per request and add headers."""
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
    request.state.request_id = request_id
    started = time.perf_counter()

    response = await call_next(request)

    duration_ms = round((time.perf_counter() - started) * 1000, 2)
    logger.info(
        "request completed",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": duration_ms,
            "client": request.client.host if request.client else None,
        },
    )
    response.headers["X-Request-ID"] = request_id

    # Hashed build assets never change under the same name.
    if request.url.path.startswith("/assets/"):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif response.headers.get("content-type", "").startswith("text/html"):
        response.headers["Cache-Control"] = "no-cache"

    return response


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    for name, value in SECURITY_HEADERS.items():
        response.headers.setdefault(name, value)
    if request.url.path not in _CSP_EXEMPT_PATHS:
        response.headers.setdefault("Content-Security-Policy", CONTENT_SECURITY_POLICY)
    if settings.is_production:
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )
    return response


app.include_router(api_router, prefix="/api")


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


def _frontend_dir() -> Path | None:
    if INDEX_FILE.is_file():
        return DIST_DIR
    if (STATIC_DIR / "index.html").is_file():
        return STATIC_DIR
    return None


FRONTEND_DIR = _frontend_dir()

if FRONTEND_DIR is not None:
    assets = FRONTEND_DIR / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets)), name="assets")

    @app.api_route(
        "/{full_path:path}",
        methods=["GET", "HEAD"],
        include_in_schema=False,
    )
    def spa_fallback(full_path: str) -> Response:
        """Serve real build files, and ``index.html`` for client-side routes."""
        # Unknown API paths must be JSON 404s, not the SPA shell.
        if full_path == "api" or full_path.startswith("api/"):
            return JSONResponse({"detail": "Not Found"}, status_code=404)

        root = FRONTEND_DIR.resolve()
        candidate = (root / full_path).resolve()
        if (
            full_path
            and candidate.is_relative_to(root)
            and candidate.is_file()
            and candidate != (FRONTEND_DIR / "index.html").resolve()
        ):
            return FileResponse(candidate)

        # Files with an extension that were not found should 404 instead of
        # returning HTML (which would confuse browsers and API clients).
        if full_path and Path(full_path).suffix:
            return JSONResponse({"detail": "Not Found"}, status_code=404)

        return FileResponse(FRONTEND_DIR / "index.html")
