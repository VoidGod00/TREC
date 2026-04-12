from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from decimal import Decimal
from typing import List, Optional
from datetime import datetime, date
import calendar

from app.models.transaction import Transaction, TransactionType, Category
from app.models.budget import Budget, AILog
from app.schemas.analytics import (
    AnalyticsDashboard, CategoryBreakdown, MonthlyTrend, BudgetStatus
)


class AnalyticsService:

    def get_dashboard(self, db: Session, user_id: int, year: int, month: int) -> AnalyticsDashboard:
        # Date range for current month
        first_day = datetime(year, month, 1)
        last_day = datetime(year, month, calendar.monthrange(year, month)[1], 23, 59, 59)

        # Previous month
        if month == 1:
            prev_month, prev_year = 12, year - 1
        else:
            prev_month, prev_year = month - 1, year

        prev_first = datetime(prev_year, prev_month, 1)
        prev_last = datetime(prev_year, prev_month, calendar.monthrange(prev_year, prev_month)[1], 23, 59, 59)

        current_txs = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.date >= first_day,
            Transaction.date <= last_day,
        ).all()

        prev_txs = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.date >= prev_first,
            Transaction.date <= prev_last,
        ).all()

        # Totals
        total_income = sum(t.amount for t in current_txs if t.type == TransactionType.INCOME)
        total_expense = sum(t.amount for t in current_txs if t.type == TransactionType.EXPENSE)
        prev_expense = sum(t.amount for t in prev_txs if t.type == TransactionType.EXPENSE)

        net_savings = total_income - total_expense
        savings_rate = float(net_savings / total_income * 100) if total_income > 0 else 0.0

        # Month-over-month change
        if prev_expense > 0:
            mom_change = float((total_expense - prev_expense) / prev_expense * 100)
        else:
            mom_change = 0.0

        # Category breakdown
        category_breakdown = self._category_breakdown(current_txs, total_expense)

        # Top expense category
        expense_cats = [c for c in category_breakdown if c.amount > 0]
        top_category = expense_cats[0].category if expense_cats else None

        # Monthly trends (last 6 months)
        monthly_trends = self._monthly_trends(db, user_id, year, month, months=6)

        # Budget status
        budget_status = self._budget_status(db, user_id, year, month, current_txs)

        # Recurring
        recurring_total = sum(
            t.amount for t in current_txs
            if t.type == TransactionType.EXPENSE and t.is_recurring
        )

        return AnalyticsDashboard(
            total_income=total_income,
            total_expense=total_expense,
            net_savings=net_savings,
            savings_rate=round(savings_rate, 2),
            top_expense_category=top_category,
            category_breakdown=category_breakdown,
            monthly_trends=monthly_trends,
            budget_status=budget_status,
            recurring_expenses_total=recurring_total,
            month_over_month_change=round(mom_change, 2),
        )

    def _category_breakdown(self, transactions: list, total_expense: Decimal) -> List[CategoryBreakdown]:
        from collections import defaultdict
        cat_totals: dict = defaultdict(lambda: {"amount": Decimal("0"), "count": 0})

        for t in transactions:
            if t.type == TransactionType.EXPENSE:
                cat_totals[t.category.value]["amount"] += t.amount
                cat_totals[t.category.value]["count"] += 1

        result = []
        for cat, data in cat_totals.items():
            pct = float(data["amount"] / total_expense * 100) if total_expense > 0 else 0.0
            result.append(CategoryBreakdown(
                category=cat,
                amount=data["amount"],
                percentage=round(pct, 2),
                count=data["count"],
            ))

        return sorted(result, key=lambda x: x.amount, reverse=True)

    def _monthly_trends(self, db: Session, user_id: int, year: int, month: int, months: int) -> List[MonthlyTrend]:
        trends = []
        y, m = year, month
        for _ in range(months):
            first = datetime(y, m, 1)
            last = datetime(y, m, calendar.monthrange(y, m)[1], 23, 59, 59)

            txs = db.query(Transaction).filter(
                Transaction.user_id == user_id,
                Transaction.date >= first,
                Transaction.date <= last,
            ).all()

            income = sum(t.amount for t in txs if t.type == TransactionType.INCOME)
            expense = sum(t.amount for t in txs if t.type == TransactionType.EXPENSE)

            trends.append(MonthlyTrend(
                month=f"{y}-{m:02d}",
                income=income,
                expense=expense,
                net=income - expense,
            ))

            m -= 1
            if m == 0:
                m = 12
                y -= 1

        return list(reversed(trends))

    def _budget_status(self, db: Session, user_id: int, year: int, month: int, transactions: list) -> List[BudgetStatus]:
        budgets = db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.year == year,
            Budget.month == month,
        ).all()

        from collections import defaultdict
        spent_by_cat: dict = defaultdict(Decimal)
        for t in transactions:
            if t.type == TransactionType.EXPENSE:
                spent_by_cat[t.category.value] += t.amount

        result = []
        for b in budgets:
            spent = spent_by_cat.get(b.category.value, Decimal("0"))
            remaining = b.limit_amount - spent
            pct = float(spent / b.limit_amount * 100) if b.limit_amount > 0 else 0.0
            result.append(BudgetStatus(
                category=b.category.value,
                budget=b.limit_amount,
                spent=spent,
                remaining=remaining,
                percentage_used=round(pct, 2),
                is_over_budget=spent > b.limit_amount,
            ))

        return result
