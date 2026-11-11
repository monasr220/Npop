"""Application configuration.

This is the single place that reads ``app/.env`` (or a project-root ``.env``).
Every other module imports ``settings`` (or the path constants) from here
instead of calling ``load_dotenv()`` again.

Security-relevant defaults are deliberately conservative:

* A missing/weak ``SECRET_KEY`` is generated for local development, but the
  application refuses to start with one when ``ENVIRONMENT=production``.
* CORS is an explicit allow-list.  In production it is empty by default, which
  means only same-origin requests (the normal deployment) are allowed.
* Upload size limits and rate limits are configurable without code changes.
"""

from __future__ import annotations

import logging
import secrets
from pathlib import Path

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

APP_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = APP_DIR.parent

DEFAULT_DATABASE_URL = f"sqlite:///{(PROJECT_DIR / 'app.db').as_posix()}"

_WEAK_SECRETS = {
    "",
    "change-me",
    "changeme",
    "change_me",
    "secret",
    "secret-key",
    "development",
    "dev",
    "password",
}

_DEV_CORS_ORIGINS = [
    "http://localhost:5001",
    "http://127.0.0.1:5001",
    "http://localhost:5002",
    "http://127.0.0.1:5002",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(APP_DIR / ".env", PROJECT_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ------------------------------------------------------------- runtime
    environment: str = "development"
    debug: bool = False
    server_host: str = "127.0.0.1"
    server_port: int = 5001

    # ------------------------------------------------------------ database
    database_url: str = DEFAULT_DATABASE_URL

    # ----------------------------------------------------------- cloudinary
    cloudinary_cloud_name: str | None = None
    cloudinary_api_key: str | None = None
    cloudinary_api_secret: str | None = None

    # --------------------------------------------------------------- auth
    secret_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # --------------------------------------------------------------- CORS
    # Comma-separated allow-list, e.g.
    #   CORS_ORIGINS=https://npop.example.com,https://www.npop.example.com
    # An empty value means "same-origin only" in production and the usual
    # localhost/Vite origins in development.
    cors_origins: str = ""

    # -------------------------------------------------------- rate limiting
    rate_limit_enabled: bool = True
    rate_limit_default: str = "300/minute"
    rate_limit_auth: str = "10/minute"
    rate_limit_upload: str = "30/minute"
    rate_limit_storage_uri: str = "memory://"

    # ------------------------------------------------------------- uploads
    max_audio_upload_mb: int = 50
    max_image_upload_mb: int = 10

    # ------------------------------------------------------------- logging
    log_level: str = "INFO"
    log_json: bool = True

    # ------------------------------------------------------------ helpers
    @property
    def is_production(self) -> bool:
        return self.environment.strip().lower() in {"production", "prod"}

    @property
    def cors_origin_list(self) -> list[str]:
        raw = self.cors_origins.strip()
        if raw:
            return [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]
        return [] if self.is_production else list(_DEV_CORS_ORIGINS)

    @property
    def max_audio_upload_bytes(self) -> int:
        return self.max_audio_upload_mb * 1024 * 1024

    @property
    def max_image_upload_bytes(self) -> int:
        return self.max_image_upload_mb * 1024 * 1024

    # ---------------------------------------------------------- validation
    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug(cls, v):
        if isinstance(v, str):
            if v.lower() in ("true", "1", "yes", "on"):
                return True
            if v.lower() in ("false", "0", "no", "off", "release"):
                return False
        return v

    @field_validator("rate_limit_enabled", "log_json", mode="before")
    @classmethod
    def parse_bool(cls, v):
        if isinstance(v, str):
            if v.lower() in ("true", "1", "yes", "on"):
                return True
            if v.lower() in ("false", "0", "no", "off"):
                return False
        return v

    @model_validator(mode="after")
    def validate_secret(self) -> "Settings":
        secret = (self.secret_key or "").strip()
        weak = secret.lower() in _WEAK_SECRETS or len(secret) < 32

        if weak:
            if self.is_production:
                raise ValueError(
                    "SECRET_KEY must be set to a random value of at least 32 "
                    "characters when ENVIRONMENT=production. Generate one with "
                    "`python -c \"import secrets; print(secrets.token_urlsafe(48))\"`."
                )
            # Local development: use an ephemeral key instead of a known default.
            self.secret_key = secrets.token_urlsafe(48)
            logging.getLogger(__name__).warning(
                "SECRET_KEY is missing or weak; generated an ephemeral development "
                "key. Tokens will not survive a restart. Set SECRET_KEY in .env."
            )

        if self.is_production and self.debug:
            raise ValueError("DEBUG must be disabled when ENVIRONMENT=production")

        return self


settings = Settings()
