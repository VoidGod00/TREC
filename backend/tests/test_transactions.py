import pytest
from decimal import Decimal
from datetime import datetime, timezone
from fastapi import status

from app.services.transaction_service import TransactionService
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionFilter
from app.models.transaction import TransactionType, Category


# ─── Unit: Transaction Service ────────────────────────────────────────────────

class TestTransactionService:

    def test_create_transaction(self, db, test_user):
        svc = TransactionService()
        data = TransactionCreate(
            amount=Decimal("250.00"),
            category=Category.FOOD,
            type=TransactionType.EXPENSE,
            date=datetime.now(timezone.utc),
        )
        tx = svc.create(db, test_user.id, data)
        assert tx.id is not None
        assert tx.amount == Decimal("250.00")
        assert tx.user_id == test_user.id

    def test_create_income_transaction(self, db, test_user):
        svc = TransactionService()
        data = TransactionCreate(
            amount=Decimal("50000.00"),
            category=Category.SALARY,
            type=TransactionType.INCOME,
            date=datetime.now(timezone.utc),
        )
        tx = svc.create(db, test_user.id, data)
        assert tx.type == TransactionType.INCOME
        assert tx.category == Category.SALARY

    def test_get_transaction_by_id(self, db, test_user, test_transaction):
        svc = TransactionService()
        tx = svc.get_by_id(db, test_user.id, test_transaction.id)
        assert tx.id == test_transaction.id

    def test_get_transaction_wrong_user_raises(self, db, test_transaction):
        from fastapi import HTTPException
        svc = TransactionService()
        with pytest.raises(HTTPException) as exc:
            svc.get_by_id(db, 9999, test_transaction.id)
        assert exc.value.status_code == 404

    def test_get_nonexistent_transaction_raises(self, db, test_user):
        from fastapi import HTTPException
        svc = TransactionService()
        with pytest.raises(HTTPException) as exc:
            svc.get_by_id(db, test_user.id, 9999)
        assert exc.value.status_code == 404

    def test_update_transaction(self, db, test_user, test_transaction):
        svc = TransactionService()
        update = TransactionUpdate(amount=Decimal("750.00"), note="Updated note")
        tx = svc.update(db, test_user.id, test_transaction.id, update)
        assert tx.amount == Decimal("750.00")
        assert tx.note == "Updated note"
        assert tx.category == test_transaction.category  # unchanged

    def test_partial_update(self, db, test_user, test_transaction):
        svc = TransactionService()
        original_amount = test_transaction.amount
        update = TransactionUpdate(note="Just updating note")
        tx = svc.update(db, test_user.id, test_transaction.id, update)
        assert tx.amount == original_amount
        assert tx.note == "Just updating note"

    def test_delete_transaction(self, db, test_user, test_transaction):
        from fastapi import HTTPException
        svc = TransactionService()
        svc.delete(db, test_user.id, test_transaction.id)
        with pytest.raises(HTTPException):
            svc.get_by_id(db, test_user.id, test_transaction.id)

    def test_list_transactions_no_filter(self, db, test_user, multiple_transactions):
        svc = TransactionService()
        result = svc.list(db, test_user.id, TransactionFilter())
        assert result.total == 5
        assert len(result.items) == 5

    def test_list_filter_by_type(self, db, test_user, multiple_transactions):
        svc = TransactionService()
        filters = TransactionFilter(type=TransactionType.EXPENSE)
        result = svc.list(db, test_user.id, filters)
        assert all(t.type == TransactionType.EXPENSE for t in result.items)
        assert result.total == 4

    def test_list_filter_by_category(self, db, test_user, multiple_transactions):
        svc = TransactionService()
        filters = TransactionFilter(category=Category.FOOD)
        result = svc.list(db, test_user.id, filters)
        assert result.total == 1
        assert result.items[0].category == Category.FOOD

    def test_list_filter_by_amount_range(self, db, test_user, multiple_transactions):
        svc = TransactionService()
        filters = TransactionFilter(min_amount=Decimal("500"), max_amount=Decimal("1000"))
        result = svc.list(db, test_user.id, filters)
        assert all(Decimal("500") <= t.amount <= Decimal("1000") for t in result.items)

    def test_list_filter_recurring(self, db, test_user, multiple_transactions):
        svc = TransactionService()
        filters = TransactionFilter(is_recurring=True)
        result = svc.list(db, test_user.id, filters)
        assert result.total == 1
        assert result.items[0].is_recurring is True

    def test_list_search(self, db, test_user, test_transaction):
        svc = TransactionService()
        filters = TransactionFilter(search="Restaurant")
        result = svc.list(db, test_user.id, filters)
        assert result.total == 1

    def test_pagination(self, db, test_user, multiple_transactions):
        svc = TransactionService()
        filters = TransactionFilter(page=1, page_size=2)
        result = svc.list(db, test_user.id, filters)
        assert len(result.items) == 2
        assert result.total_pages == 3  # 5 items / 2 per page

    def test_bulk_delete(self, db, test_user, multiple_transactions):
        svc = TransactionService()
        ids = [t.id for t in multiple_transactions[:3]]
        count = svc.bulk_delete(db, test_user.id, ids)
        assert count == 3


# ─── Schema Validation ────────────────────────────────────────────────────────

class TestTransactionSchema:

    def test_negative_amount_rejected(self):
        with pytest.raises(Exception):
            TransactionCreate(
                amount=Decimal("-100.00"),
                category=Category.FOOD,
                type=TransactionType.EXPENSE,
                date=datetime.now(timezone.utc),
            )

    def test_zero_amount_rejected(self):
        with pytest.raises(Exception):
            TransactionCreate(
                amount=Decimal("0"),
                category=Category.FOOD,
                type=TransactionType.EXPENSE,
                date=datetime.now(timezone.utc),
            )

    def test_excessive_amount_rejected(self):
        with pytest.raises(Exception):
            TransactionCreate(
                amount=Decimal("999999999.00"),
                category=Category.FOOD,
                type=TransactionType.EXPENSE,
                date=datetime.now(timezone.utc),
            )


# ─── Integration: Transaction API ─────────────────────────────────────────────

class TestTransactionAPI:

    def test_create_transaction_endpoint(self, client, auth_headers):
        response = client.post("/api/v1/transactions", headers=auth_headers, json={
            "amount": "450.00",
            "category": "food",
            "type": "expense",
            "date": "2024-01-15T10:00:00Z",
            "note": "Dinner",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["amount"] == "450.00"
        assert data["category"] == "food"

    def test_create_transaction_unauthenticated(self, client):
        response = client.post("/api/v1/transactions", json={
            "amount": "100.00",
            "category": "food",
            "type": "expense",
            "date": "2024-01-15T10:00:00Z",
        })
        assert response.status_code == 403

    def test_get_transaction(self, client, auth_headers, test_transaction):
        response = client.get(f"/api/v1/transactions/{test_transaction.id}", headers=auth_headers)
        assert response.status_code == 200

    def test_update_transaction(self, client, auth_headers, test_transaction):
        response = client.put(
            f"/api/v1/transactions/{test_transaction.id}",
            headers=auth_headers,
            json={"amount": "999.99"},
        )
        assert response.status_code == 200
        assert response.json()["amount"] == "999.99"

    def test_delete_transaction(self, client, auth_headers, test_transaction):
        response = client.delete(
            f"/api/v1/transactions/{test_transaction.id}",
            headers=auth_headers
        )
        assert response.status_code == 204

    def test_list_transactions_paginated(self, client, auth_headers, multiple_transactions):
        response = client.get(
            "/api/v1/transactions?page=1&page_size=2",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert len(data["items"]) == 2
        assert data["total"] == 5

    def test_list_transactions_filter_by_type(self, client, auth_headers, multiple_transactions):
        response = client.get(
            "/api/v1/transactions?type=expense",
            headers=auth_headers
        )
        assert response.status_code == 200
        items = response.json()["items"]
        assert all(t["type"] == "expense" for t in items)

    def test_get_other_users_transaction_fails(self, client, auth_headers, db):
        # Create a second user's transaction
        from app.models.user import User
        from app.core.security import hash_password
        other_user = User(name="Other", email="other@test.com",
                          hashed_password=hash_password("Other@1234"))
        db.add(other_user)
        db.commit()
        db.refresh(other_user)

        other_tx = __import__('app.models.transaction', fromlist=['Transaction']).Transaction(
            user_id=other_user.id,
            amount=Decimal("100"),
            category=Category.FOOD,
            type=TransactionType.EXPENSE,
            date=datetime.now(timezone.utc),
        )
        db.add(other_tx)
        db.commit()

        response = client.get(f"/api/v1/transactions/{other_tx.id}", headers=auth_headers)
        assert response.status_code == 404
