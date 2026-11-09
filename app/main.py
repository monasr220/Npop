"""FastAPI application entrypoint.

Run with ``uv run uvicorn app.main:app --reload`` or simply ``uv run main.py``.

The JSON API lives under ``/api``.  The single-page frontend in ``Frontend/``
is served from ``/`` so the whole project can be opened at one URL.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import app.models  # noqa: F401  (registers every table on Base.metadata)
from app.api import api_router
from app.core.config import PROJECT_DIR
from app.db.base import Base
from app.db.session import get_engine

FRONTEND_DIR = PROJECT_DIR / "Frontend"


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # The project uses a lightweight create_all setup instead of migrations.
    Base.metadata.create_all(bind=get_engine())
    yield


app = FastAPI(
    title="Npop API",
    description="Music and social app: artists, albums, tracks, playlists and posts.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


# Mount the SPA last so the API and /health keep priority.
if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
