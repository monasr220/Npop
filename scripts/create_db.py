"""Create the application database from the SQLAlchemy models.

Run from the project root::

    uv run scripts/create_db.py

The database file and URL come from ``app/.env`` (``DATABASE_URL``).  Relative
SQLite paths are anchored to the project root, so this works no matter where the
command is launched from.  Existing tables are left untouched; only missing
ones are created.
"""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import inspect  # noqa: E402

import app.models  # noqa: E402,F401  (registers every table)
from app.db.base import Base  # noqa: E402
from app.db.session import get_database_url, get_engine  # noqa: E402


def main() -> None:
    url = get_database_url()
    engine = get_engine()
    Base.metadata.create_all(engine)

    tables = sorted(inspect(engine).get_table_names())
    print(f"DATABASE_URL: {url}")
    print(f"engine: {engine.url.render_as_string(hide_password=True)}")
    print(f"created/verified {len(tables)} tables -> {', '.join(tables)}")


if __name__ == "__main__":
    main()
