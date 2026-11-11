"""Media storage helpers and upload validation.

Uploads are validated **before** they are sent to Cloudinary:

* size caps from :mod:`app.core.config`
* an extension/content-type allow-list
* magic-byte checks so a renamed executable cannot masquerade as an image or
  an audio file

The Cloudinary credentials are optional for local development.  When they are
not configured, uploads fail with a clear 503 instead of a stack trace; hosted
URLs continue to work.
"""

from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

import cloudinary
import cloudinary.api
import cloudinary.uploader
from fastapi import HTTPException, status

from app.core.config import settings

config = cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True,
)

AUDIO_EXTENSIONS = {".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac", ".opus"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"}

_AUDIO_CONTENT_TYPES = {
    "application/octet-stream",
    "binary/octet-stream",
    "application/mp4",
    "video/mp4",
    "video/x-m4a",
}
_IMAGE_CONTENT_TYPES = {
    "application/octet-stream",
    "binary/octet-stream",
}


def _stream(file):
    return getattr(file, "file", file)


def _read_head(stream, size: int = 32) -> bytes:
    """Read the first ``size`` bytes without moving the stream permanently."""
    try:
        position = stream.tell()
    except (AttributeError, OSError, ValueError):
        position = None

    try:
        try:
            stream.seek(0)
        except (AttributeError, OSError, ValueError):
            pass
        head = stream.read(size) or b""
    finally:
        if position is not None:
            try:
                stream.seek(position)
            except (AttributeError, OSError, ValueError):
                pass

    return head if isinstance(head, bytes) else bytes(head)


def _file_size(file) -> int | None:
    size = getattr(file, "size", None)
    if isinstance(size, int) and size >= 0:
        return size

    stream = _stream(file)
    try:
        position = stream.tell()
        stream.seek(0, 2)
        size = stream.tell()
        stream.seek(position)
        return int(size)
    except (AttributeError, OSError, ValueError):
        return None


def _detect_signature(head: bytes) -> str | None:
    if head.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if head.startswith((b"GIF87a", b"GIF89a")):
        return "gif"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    if head[:4] == b"RIFF" and head[8:12] == b"WAVE":
        return "wav"
    if head[:4] == b"OggS":
        return "ogg"
    if head[:4] == b"fLaC":
        return "flac"
    if head[:3] == b"ID3":
        return "mp3"
    if len(head) >= 2 and head[0] == 0xFF and (head[1] & 0xE0) == 0xE0:
        return "mp3"
    if len(head) >= 12 and head[4:8] == b"ftyp":
        return "mp4"
    return None


def _content_type_allowed(content_type: str | None, kind: str) -> bool:
    if not content_type:
        return True
    value = content_type.split(";", 1)[0].strip().lower()
    if kind == "audio":
        return value.startswith("audio/") or value in _AUDIO_CONTENT_TYPES
    return value.startswith("image/") or value in _IMAGE_CONTENT_TYPES


def _extension_allowed(filename: str | None, kind: str) -> bool:
    if not filename:
        return True
    suffix = Path(filename).suffix.lower()
    if not suffix:
        return True
    return suffix in (AUDIO_EXTENSIONS if kind == "audio" else IMAGE_EXTENSIONS)


def validate_upload(file, kind: str) -> None:
    """Validate an uploaded file for ``kind`` (``"audio"`` or ``"image"``).

    Raises :class:`fastapi.HTTPException` with 413 for oversized files and 400
    for anything that does not look like the declared media type.
    """
    if file is None:
        return

    max_bytes = (
        settings.max_audio_upload_bytes
        if kind == "audio"
        else settings.max_image_upload_bytes
    )
    size = _file_size(file)
    if size is not None and size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"File is too large. The maximum {kind} upload is "
                f"{max_bytes // (1024 * 1024)} MB."
            ),
        )
    if size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    content_type = getattr(file, "content_type", None)
    if not _content_type_allowed(content_type, kind):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported {kind} content type: {content_type}.",
        )

    filename = getattr(file, "filename", None)
    if not _extension_allowed(filename, kind):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported {kind} file extension.",
        )

    head = _read_head(_stream(file))
    signature = _detect_signature(head)
    if signature is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"The file does not look like a valid {kind} file. "
                "Only real audio/image data is accepted."
            ),
        )

    if kind == "image" and signature in {"wav", "ogg", "flac", "mp3", "mp4"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is not an image.",
        )
    if kind == "audio" and signature in {"jpeg", "png", "gif", "webp"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is not audio.",
        )


def ensure_http_url(value: str, *, field: str = "URL") -> str:
    """Reject non-http(s) URLs before they are stored or rendered as links."""
    candidate = (value or "").strip()
    parsed = urlparse(candidate)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field} must be a valid http(s) URL.",
        )
    return candidate


def upload(file, *, kind: str = "auto", folder: str = "app-uploads") -> str | None:
    """Upload a validated file to Cloudinary and return its secure URL."""
    if kind in {"audio", "image"}:
        validate_upload(file, kind)

    if not (
        settings.cloudinary_cloud_name
        and settings.cloudinary_api_key
        and settings.cloudinary_api_secret
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Media storage is not configured. Set CLOUDINARY_CLOUD_NAME, "
                "CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET, or provide a "
                "hosted URL instead."
            ),
        )

    response = cloudinary.uploader.upload(
        file,
        unique_filename=True,
        overwrite=False,
        asset_folder=folder,
        resource_type="auto",
    )
    return response.get("secure_url")
