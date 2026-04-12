import pytest
from decimal import Decimal
from datetime import datetime, timezone

from app.services.analytics_service import AnalyticsService
from app.models.transaction import Transaction, TransactionType, Category
from app.models.budget import Budget


class TestAnalyticsService:

    def test_dashboard_empty_data(self, db, test_user):
        svc = AnalyticsService()
        result = svc.get_dashboard(db, test_user.id, 2024, 1)
        assert result.total_income == Decimal("0")
        assert result.total_expense == Decimal("0")
        assert result.net_savings == Decimal("0")
        assert result.savings_rate == 0.0
        assert result.category_breakdown == []

    def test_dashboard_with_transactions(self, db, test_user, multiple_transactions):
        svc = AnalyticsService()
        result = svc.get_dashboard(db, test_user.id, 2024, 1)
        assert result.total_income == Decimal("5000.00")
        assert result.total_expense == Decimal("2500.00")
        assert result.net_savings == Decimal("2500.00")
        assert result.savings_rate == 50.0

    def test_category_breakdown_correct_percentages(self, db, test_user, multiple_transactions):
        svc = AnalyticsService()
        result = svc.get_dashboard(db, test_user.id, 2024, 1)
        total_pct = sum(c.percentage for c in result.category_breakdown)
        # Should sum to ~100%
        assert abs(total_pct - 100.0) < 0.01

    def test_category_breakdown_sorted_by_amount(self, db, test_user, multiple_transactions):
        svc = AnalyticsService()
        result = svc.get_dashboard(db, test_user.id, 2024, 1)
        amounts = [c.amount for c in result.category_breakdown]
        assert amounts == sorted(amounts, reverse=True)

    def test_top_expense_category(self, db, test_user, multiple_transactions):
        svc = AnalyticsService()
        result = svc.get_dashboard(db, test_user.id, 2024, 1)
        # Rent (1200) > Food (800) > Transport (300) > Entertainment (200)
        assert result.top_expense_category == "rent"

    def test_recurring_expenses_total(self, db, test_user, multiple_transactions):
        svc = AnalyticsService()
        result = svc.get_dashboard(db, test_user.id, 2024, 1)
        # Only transport (300) is recurring
        assert result.recurring_expenses_total == Decimal("300.00")

    def test_monthly_trends_count(self, db, test_user, multiple_transactions):
        svc = AnalyticsService()
        result = svc.get_dashboard(db, test_user.id, 2024, 1)
        assert len(result.monthly_trends) == 6

    def test_monthly_trends_chronological_order(self, db, test_user, multiple_transactions):
        svc = AnalyticsService()
        result = svc.get_dashboard(db, test_user.id, 2024, 1)
        months = [t.month for t in result.monthly_trends]
        assert months == sorted(months)

    def test_budget_status_within_budget(self, db, test_user, multiple_transactions):
        # Set a food budget of 1000 (spent 800)
        budget = Budget(
            user_id=test_user.id,
            category=Category.FOOD,
            limit_amount=Decimal("1000.00"),
            month=1,
            year=2024,
        )
        db.add(budget)
        db.commit()

        svc = AnalyticsService()
        result = svc.get_dashboard(db, test_user.id, 2024, 1)

        food_budget = next((b for b in result.budget_status if b.category == "food"), None)
        assert food_budget is not None
        assert food_budget.is_over_budget is False
        assert food_budget.spent == Decimal("800.00")
        assert food_budget.remaining == Decimal("200.00")

    def test_budget_status_over_budget(self, db, test_user, multiple_transactions):
        # Set a food budget of 500 (spent 800)
        budget = Budget(
            user_id=test_user.id,
            category=Category.FOOD,
            limit_amount=Decimal("500.00"),
            month=1,
            year=2024,
        )
        db.add(budget)
        db.commit()

        svc = AnalyticsService()
        result = svc.get_dashboard(db, test_user.id, 2024, 1)

        food_budget = next((b for b in result.budget_status if b.category == "food"), None)
        assert food_budget is not None
        assert food_budget.is_over_budget is True
        assert food_budget.remaining == Decimal("-300.00")

    def test_month_over_month_change_increase(self, db, test_user):
        # Jan: 1000 expense, Feb: 1500 expense
        for day, amount, month in [(5, "1000", 1), (5, "1500", 2)]:
            tx = Transaction(
                user_id=test_user.id, amount=Decimal(amount), category=Category.FOOD,
                type=TransactionType.EXPENSE,
                date=datetime(2024, month, day, tzinfo=timezone.utc)
            )
            db.add(tx)
        db.commit()

        svc = AnalyticsService()
        result = svc.get_dashboard(db, test_user.id, 2024, 2)
        assert result.month_over_month_change == 50.0

    def test_savings_rate_zero_income(self, db, test_user):
        tx = Transaction(
            user_id=test_user.id, amount=Decimal("500"), category=Category.FOOD,
            type=TransactionType.EXPENSE, date=datetime(2024, 1, 5, tzinfo=timezone.utc),
        )
        db.add(tx)
        db.commit()

        svc = AnalyticsService()
        result = svc.get_dashboard(db, test_user.id, 2024, 1)
        assert result.savings_rate == 0.0


# ─── Integration: Analytics API ───────────────────────────────────────────────

class TestAnalyticsAPI:

    def test_dashboard_endpoint(self, client, auth_headers, multiple_transactions):
        response = client.get(
            "/api/v1/analytics/dashboard?year=2024&month=1",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_income" in data
        assert "total_expense" in data
        assert "category_breakdown" in data
        assert "monthly_trends" in data

    def test_dashboard_requires_auth(self, client):
        response = client.get("/api/v1/analytics/dashboard")
        assert response.status_code == 401

    def test_create_budget_endpoint(self, client, auth_headers):
        response = client.post("/api/v1/analytics/budgets", headers=auth_headers, json={
            "category": "food",
            "limit_amount": "3000.00",
            "month": 1,
            "year": 2024,
        })
        assert response.status_code == 201
        data = response.json()
        assert data["category"] == "food"
        assert data["limit_amount"] == "3000.00"

    def test_get_budgets_endpoint(self, client, auth_headers):
        # Create a budget first
        client.post("/api/v1/analytics/budgets", headers=auth_headers, json={
            "category": "transport",
            "limit_amount": "1000.00",
            "month": 2,
            "year": 2024,
        })
        response = client.get(
            "/api/v1/analytics/budgets?year=2024&month=2",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert len(response.json()) == 1
