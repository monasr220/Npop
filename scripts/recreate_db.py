"""Drop and recreate the configured application database.

Run from the project root::

    uv run scripts/recreate_db.py --yes

The database file and URL come from ``app/.env`` (``DATABASE_URL``).  This
script is destructive: it drops every table known to the models and creates the
current schema again.  It refuses to run without ``--yes`` and never touches the
legacy ``new.db`` seed database.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy import inspect  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402

import app.models  # noqa: E402,F401  (registers every table)
from app.db.base import Base  # noqa: E402
from app.db.session import get_database_url, get_engine  # noqa: E402

LEGACY_DB_NAME = "new.db"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--yes",
        action="store_true",
        help="confirm dropping every table in the configured database",
    )
    args = parser.parse_args()

    url = get_database_url()
    database = make_url(url).database

    if database and Path(database).name.lower() == LEGACY_DB_NAME:
        raise SystemExit(
            f"Refusing to recreate the legacy database {database!r}."
        )

    if not args.yes:
        raise SystemExit(
            "This drops every table. Re-run with --yes to confirm."
        )

    engine = get_engine()
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    tables = sorted(inspect(engine).get_table_names())
    print(f"DATABASE_URL: {url}")
    print(f"recreated {len(tables)} tables -> {', '.join(tables)}")


if __name__ == "__main__":
    main()
