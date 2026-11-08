"""Cloudinary storage helpers."""

from __future__ import annotations

import cloudinary
import cloudinary.api
import cloudinary.uploader

from app.core.config import settings

config = cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True,
)


def upload(file) -> str | None:
    response = cloudinary.uploader.upload(
        file,
        unique_filename=False,
        overwrite=True,
        asset_folder="app-uploads",
        resource_type="auto",
    )
    return response.get("secure_url")
