"""Project launcher: ``uv run main.py`` starts the FastAPI app with uvicorn."""

from __future__ import annotations

import uvicorn

from app.core.config import settings


def main() -> None:
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=settings.server_port,
        reload=settings.debug,
    )


if __name__ == "__main__":
    main()
