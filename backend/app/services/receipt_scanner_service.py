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

from app.core.config import settings
from app.core.logging import logger

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

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
  "suggested_category": "one of: food, transport, rent, utilities, entertainment, healthcare, shopping, travel, education, savings, salary, freelance, investment, other",
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

    async def scan_receipt(self, file: UploadFile) -> ScannedReceipt:
        self._validate_file(file)
        raw_bytes = await file.read()
        self._validate_size(raw_bytes)

        pil_image = self._load_image(raw_bytes, file.content_type)
        gemini_response_text = await self._call_gemini(pil_image)
        receipt = self._parse_response(gemini_response_text)

        logger.info(
            f"Receipt scanned successfully: {receipt.merchant_name} - Total: {receipt.total}"
        )
        return receipt

    @staticmethod
    def _validate_file(file: UploadFile) -> None:
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file type: {file.content_type}",
            )

    @staticmethod
    def _validate_size(data: bytes) -> None:
        if len(data) > MAX_FILE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File size exceeds 10MB limit.",
            )

    @staticmethod
    def _load_image(data: bytes, mime_type: str) -> Image.Image:
        try:
            img = Image.open(BytesIO(data))
            img = _apply_exif_rotation(img)

            # FIX: Resize to 1024x1024 to ensure the image byte size fits inline constraints
            img.thumbnail((1024, 1024), Image.LANCZOS)

            # FIX: Ensure image is strictly RGB to prevent JPEG conversion crashes
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            return img
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Image decoding failed: {exc}",
            )

    async def _call_gemini(self, image: Image.Image) -> str:
        """Send image + prompt to Gemini; forces inline Base64 to bypass location blocks."""
        try:
            # FIX: Convert the image into raw JPEG bytes
            buffered = BytesIO()
            image.save(buffered, format="JPEG", quality=85)
            img_bytes = buffered.getvalue()

            # FIX: Explicitly package it as inline payload.
            # This stops the SDK from trying to use the restricted Google File API.
            image_part = {
                "mime_type": "image/jpeg",
                "data": img_bytes
            }

            # Pass the constructed `image_part` instead of the PIL image object
            response = await self.model.generate_content_async(
                contents=[_EXTRACTION_PROMPT, image_part],
                generation_config=genai.GenerationConfig(
                    temperature=0.0,
                    max_output_tokens=2048,
                ),
            )

            if hasattr(response, '__aiter__'):
                full_text = ""
                async for chunk in response:
                    full_text += chunk.text
                return full_text

            return response.text

        except Exception as exc:
            logger.error(f"Gemini Vision API Error: {str(exc)}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI service failed to process the image. Check logs for location or API errors.",
            )

    @staticmethod
    def _parse_response(raw: str) -> ScannedReceipt:
        """Parse Gemini JSON output into ScannedReceipt with robust cleaning."""
        # Remove markdown code blocks and whitespace
        cleaned = re.sub(r"```(?:json)?", "", raw).strip()
        cleaned = cleaned.replace("```", "")

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse Gemini JSON: {cleaned[:500]}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="AI returned malformed data. Try a clearer photo.",
            )

        # Total is a hard requirement for the ScannedReceipt schema
        if not data.get("total"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Receipt total could not be identified.",
            )

        try:
            return ScannedReceipt(**data)
        except Exception as exc:
            logger.error(f"Schema Validation Error: {str(exc)}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Data validation failed: {exc}",
            )


def _apply_exif_rotation(img: Image.Image) -> Image.Image:
    try:
        from PIL import ExifTags
        exif = img._getexif()
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