"""Database configuration, engine and session helpers.

This is the only module that owns database connectivity.  The engine is created
lazily so importing the models package never requires a reachable server.
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import Engine, create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import PROJECT_DIR, settings


def resolve_database_url(database_url: str) -> str:
    """Anchor relative SQLite paths to the project root.

    A URL such as ``sqlite:///./app.db`` would otherwise resolve against the
    current working directory, which differs depending on how the app is
    started.  Absolute paths and ``:memory:`` are left untouched.
    """
    url = make_url(database_url)
    if url.get_backend_name() != "sqlite":
        return database_url

    database = url.database
    if not database or database == ":memory:" or Path(database).is_absolute():
        return database_url

    resolved = (PROJECT_DIR / database).resolve()
    # Use forward slashes so the URL stays readable on Windows as well.
    return f"sqlite:///{resolved.as_posix()}"


def get_database_url() -> str:
    return resolve_database_url(settings.database_url)


def create_engine_for(database_url: str) -> Engine:
    connect_args = (
        {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    )
    return create_engine(database_url, connect_args=connect_args, future=True)


def create_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(
        bind=engine, autoflush=False, expire_on_commit=False, future=True
    )


_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    """Return the process-wide engine, creating it on first use."""
    global _engine
    if _engine is None:
        _engine = create_engine_for(get_database_url())
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    global _session_factory
    if _session_factory is None:
        _session_factory = create_session_factory(get_engine())
    return _session_factory


def SessionLocal() -> Session:
    """Create a new session bound to the configured database."""
    return get_session_factory()()


def get_db() -> Iterator[Session]:
    """FastAPI dependency that yields a request-scoped session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
