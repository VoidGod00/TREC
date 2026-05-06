"""
TREC — Smart Receipt Scanner Service
Uses Google Gemini Vision to extract structured data from receipt images.
Drop-in integration for the existing FastAPI + SQLAlchemy backend.
"""

from __future__ import annotations

import base64
import json
import re
from datetime import date, datetime
from decimal import Decimal
from io import BytesIO
from typing import Optional

import google.generativeai as genai
from fastapi import HTTPException, UploadFile, status
from PIL import Image
from pydantic import BaseModel, Field, field_validator

from app.core.config import settings  # existing settings module
from app.core.logging import logger   # IMPORTING YOUR CUSTOM LOGGER DIRECTLY

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Add GEMINI_API_KEY to your .env / Pydantic settings
genai.configure(api_key=settings.GEMINI_API_KEY)

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------


class ReceiptLineItem(BaseModel):
    description: str
    quantity: Optional[float] = None
    unit_price: Optional[Decimal] = None
    total: Optional[Decimal] = None


class ScannedReceipt(BaseModel):
    merchant_name: Optional[str] = None
    merchant_address: Optional[str] = None
    transaction_date: Optional[date] = None
    transaction_time: Optional[str] = None
    line_items: list[ReceiptLineItem] = Field(default_factory=list)
    subtotal: Optional[Decimal] = None
    tax: Optional[Decimal] = None
    tip: Optional[Decimal] = None
    total: Decimal
    payment_method: Optional[str] = None
    currency: str = "USD"
    suggested_category: str = "Other"
    confidence_score: float = Field(ge=0.0, le=1.0, default=0.0)
    raw_text: Optional[str] = None

    @field_validator("total", mode="before")
    @classmethod
    def parse_total(cls, v):
        if isinstance(v, str):
            v = re.sub(r"[^\d.]", "", v)
        return Decimal(str(v))


# ---------------------------------------------------------------------------
# Gemini prompt
# ---------------------------------------------------------------------------

_EXTRACTION_PROMPT = """
You are a precise receipt data extraction engine. Analyze the receipt image and return a JSON object ONLY — no markdown, no explanation.

Required JSON schema:
{
  "merchant_name": "string or null",
  "merchant_address": "string or null",
  "transaction_date": "YYYY-MM-DD or null",
  "transaction_time": "HH:MM or null",
  "line_items": [
    {"description": "string", "quantity": number|null, "unit_price": number|null, "total": number|null}
  ],
  "subtotal": number|null,
  "tax": number|null,
  "tip": number|null,
  "total": number,
  "payment_method": "cash|card|upi|other or null",
  "currency": "3-letter ISO code, default USD",
  "suggested_category": "one of: Food & Dining, Groceries, Transport, Shopping, Entertainment, Health, Utilities, Travel, Subscriptions, Other",
  "confidence_score": 0.0 to 1.0,
  "raw_text": "all text you can read from the receipt"
}

Rules:
- All monetary values must be plain numbers (no currency symbols).
- If you cannot read a field clearly, use null.
- confidence_score reflects overall extraction quality.
- Return ONLY the JSON object.
"""


# ---------------------------------------------------------------------------
# Service class
# ---------------------------------------------------------------------------


class ReceiptScannerService:
    """Extracts structured data from a receipt image using Gemini Vision."""

    def __init__(self, model_name: str = "gemini-2.5-flash"):
        self.model = genai.GenerativeModel(model_name)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def scan_receipt(self, file: UploadFile) -> ScannedReceipt:
        """
        Accept a FastAPI UploadFile, call Gemini Vision, return ScannedReceipt.

        Usage in a route:
            scanner = ReceiptScannerService()
            result = await scanner.scan_receipt(upload_file)
        """
        self._validate_file(file)
        raw_bytes = await file.read()
        self._validate_size(raw_bytes)

        pil_image = self._load_image(raw_bytes, file.content_type)
        gemini_response = await self._call_gemini(pil_image)
        receipt = self._parse_response(gemini_response)

        logger.info(
            "receipt_scanned",
            merchant=receipt.merchant_name,
            total=str(receipt.total),
            confidence=receipt.confidence_score,
        )
        return receipt

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _validate_file(file: UploadFile) -> None:
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file type: {file.content_type}. "
                       f"Allowed: {', '.join(ALLOWED_MIME_TYPES)}",
            )

    @staticmethod
    def _validate_size(data: bytes) -> None:
        if len(data) > MAX_FILE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large ({len(data) // 1024} KB). Max: {MAX_FILE_BYTES // 1024} KB.",
            )

    @staticmethod
    def _load_image(data: bytes, mime_type: str) -> Image.Image:
        try:
            img = Image.open(BytesIO(data))
            # Normalise rotation from EXIF
            img = _apply_exif_rotation(img)
            # Resize if huge (Gemini works fine up to ~3000px)
            img.thumbnail((3000, 3000), Image.LANCZOS)
            return img
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Could not decode image: {exc}",
            ) from exc

    async def _call_gemini(self, image: Image.Image) -> str:
        """Send image + prompt to Gemini; return raw text response."""
        try:
            response = await self.model.generate_content_async(
                [_EXTRACTION_PROMPT, image],
                generation_config=genai.GenerationConfig(
                    temperature=0.0,  # deterministic extraction
                    max_output_tokens=2048,
                ),
            )
            return response.text
        except Exception as exc:
            logger.error("gemini_api_error", error=str(exc))
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Receipt scanning service temporarily unavailable.",
            ) from exc

    @staticmethod
    def _parse_response(raw: str) -> ScannedReceipt:
        """Parse Gemini JSON output into ScannedReceipt, with fallback."""
        # Strip accidental markdown fences
        cleaned = re.sub(r"```(?:json)?", "", raw).strip()
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            logger.warning("gemini_json_parse_failed", raw=raw[:200])
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not extract structured data from receipt.",
            ) from exc

        # Ensure total exists (required field)
        if not data.get("total"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not determine receipt total from image.",
            )

        try:
            return ScannedReceipt(**data)
        except Exception as exc:
            logger.error("receipt_schema_error", error=str(exc), data=data)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Receipt data malformed: {exc}",
            ) from exc


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------


def _apply_exif_rotation(img: Image.Image) -> Image.Image:
    """Correct image orientation from EXIF data."""
    try:
        from PIL import ExifTags
        exif = img._getexif()  # type: ignore[attr-defined]
        if exif is None:
            return img
        orientation_key = next(
            k for k, v in ExifTags.TAGS.items() if v == "Orientation"
        )
        orientation = exif.get(orientation_key)
        rotations = {3: 180, 6: 270, 8: 90}
        if orientation in rotations:
            img = img.rotate(rotations[orientation], expand=True)
    except Exception:
        pass
    return img