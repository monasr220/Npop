"""Application configuration.

This is the single place that reads ``app/.env``.  Every other module imports
``settings`` (or the path constants) from here instead of calling
``load_dotenv()`` again.
"""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

APP_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = APP_DIR.parent

DEFAULT_DATABASE_URL = f"sqlite:///{(PROJECT_DIR / 'app.db').as_posix()}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(APP_DIR / ".env", PROJECT_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    debug: bool = False
    server_port: int = 5001

    database_url: str = DEFAULT_DATABASE_URL

    cloudinary_cloud_name: str | None = None
    cloudinary_api_key: str | None = None
    cloudinary_api_secret: str | None = None

    secret_key: str = "change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30


settings = Settings()
