from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models.transaction import TransactionType, Category


class TransactionCreate(BaseModel):
    amount: Decimal
    category: Category
    type: TransactionType
    date: datetime
    note: Optional[str] = None
    merchant: Optional[str] = None
    is_recurring: bool = False
    tags: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be positive")
        if v > Decimal("99999999.99"):
            raise ValueError("Amount exceeds maximum allowed value")
        return v


class TransactionUpdate(BaseModel):
    amount: Optional[Decimal] = None
    category: Optional[Category] = None
    type: Optional[TransactionType] = None
    date: Optional[datetime] = None
    note: Optional[str] = None
    merchant: Optional[str] = None
    is_recurring: Optional[bool] = None
    tags: Optional[str] = None


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    amount: Decimal
    category: Category
    type: TransactionType
    date: datetime
    note: Optional[str]
    merchant: Optional[str]
    is_recurring: bool
    tags: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]


class TransactionListResponse(BaseModel):
    items: List[TransactionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class TransactionFilter(BaseModel):
    category: Optional[Category] = None
    type: Optional[TransactionType] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
    search: Optional[str] = None
    is_recurring: Optional[bool] = None
    page: int = 1
    page_size: int = 20
