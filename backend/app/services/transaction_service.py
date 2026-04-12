from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from fastapi import HTTPException, status
from datetime import datetime
from decimal import Decimal
from typing import Optional,List
import math

from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionFilter, TransactionListResponse


class TransactionService:

    def create(self, db: Session, user_id: int, data: TransactionCreate) -> Transaction:
        tx = Transaction(
            user_id=user_id,
            amount=data.amount,
            category=data.category,
            type=data.type,
            date=data.date,
            note=data.note,
            merchant=data.merchant,
            is_recurring=data.is_recurring,
            tags=data.tags,
        )
        db.add(tx)
        db.commit()
        db.refresh(tx)
        return tx

    def get_by_id(self, db: Session, user_id: int, tx_id: int) -> Transaction:
        tx = db.query(Transaction).filter(
            Transaction.id == tx_id,
            Transaction.user_id == user_id
        ).first()
        if not tx:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
        return tx

    def list(self, db: Session, user_id: int, filters: TransactionFilter) -> TransactionListResponse:
        query = db.query(Transaction).filter(Transaction.user_id == user_id)

        if filters.category:
            query = query.filter(Transaction.category == filters.category)
        if filters.type:
            query = query.filter(Transaction.type == filters.type)
        if filters.date_from:
            query = query.filter(Transaction.date >= filters.date_from)
        if filters.date_to:
            query = query.filter(Transaction.date <= filters.date_to)
        if filters.min_amount is not None:
            query = query.filter(Transaction.amount >= filters.min_amount)
        if filters.max_amount is not None:
            query = query.filter(Transaction.amount <= filters.max_amount)
        if filters.is_recurring is not None:
            query = query.filter(Transaction.is_recurring == filters.is_recurring)
        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.filter(
                or_(
                    Transaction.note.ilike(search_term),
                    Transaction.merchant.ilike(search_term),
                    Transaction.tags.ilike(search_term),
                )
            )

        total = query.count()
        total_pages = math.ceil(total / filters.page_size) if total > 0 else 0
        offset = (filters.page - 1) * filters.page_size

        items = query.order_by(Transaction.date.desc()).offset(offset).limit(filters.page_size).all()

        return TransactionListResponse(
            items=items,
            total=total,
            page=filters.page,
            page_size=filters.page_size,
            total_pages=total_pages,
        )

    def update(self, db: Session, user_id: int, tx_id: int, data: TransactionUpdate) -> Transaction:
        tx = self.get_by_id(db, user_id, tx_id)
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(tx, field, value)
        db.commit()
        db.refresh(tx)
        return tx

    def delete(self, db: Session, user_id: int, tx_id: int) -> None:
        tx = self.get_by_id(db, user_id, tx_id)
        db.delete(tx)
        db.commit()

    def bulk_delete(self, db: Session, user_id: int, ids: List[int]) -> int:
        deleted = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.id.in_(ids)
        ).delete(synchronize_session=False)
        db.commit()
        return deleted
