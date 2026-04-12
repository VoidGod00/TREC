from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from app.database import get_db
from app.schemas.transaction import (
    TransactionCreate, TransactionUpdate, TransactionResponse,
    TransactionListResponse, TransactionFilter
)
from app.models.transaction import TransactionType, Category
from app.services.transaction_service import TransactionService
from app.core.security import get_current_user_id

router = APIRouter(prefix="/transactions", tags=["Transactions"])
service = TransactionService()


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Add a new transaction."""
    return service.create(db, user_id, data)


@router.get("", response_model=TransactionListResponse)
def list_transactions(
    category: Optional[Category] = None,
    type: Optional[TransactionType] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    min_amount: Optional[Decimal] = None,
    max_amount: Optional[Decimal] = None,
    search: Optional[str] = None,
    is_recurring: Optional[bool] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """List transactions with filters and pagination."""
    filters = TransactionFilter(
        category=category, type=type, date_from=date_from, date_to=date_to,
        min_amount=min_amount, max_amount=max_amount, search=search,
        is_recurring=is_recurring, page=page, page_size=page_size,
    )
    return service.list(db, user_id, filters)


@router.get("/{tx_id}", response_model=TransactionResponse)
def get_transaction(
    tx_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get a single transaction by ID."""
    return service.get_by_id(db, user_id, tx_id)


@router.put("/{tx_id}", response_model=TransactionResponse)
def update_transaction(
    tx_id: int,
    data: TransactionUpdate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Update a transaction."""
    return service.update(db, user_id, tx_id, data)


@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    tx_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Delete a transaction."""
    service.delete(db, user_id, tx_id)


@router.delete("", status_code=status.HTTP_200_OK)
def bulk_delete(
    ids: List[int],
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Bulk delete transactions."""
    count = service.bulk_delete(db, user_id, ids)
    return {"deleted": count}
