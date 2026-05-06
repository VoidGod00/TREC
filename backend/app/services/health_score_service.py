from __future__ import annotations

import statistics
from datetime import date, datetime, timedelta
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import func, select

from app.models.transaction import Transaction, TransactionType
from app.models.budget import Budget


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class HealthAxis(BaseModel):
    name: str
    score: int
    label: str
    insight: str
    icon: str


class FinancialHealthReport(BaseModel):
    overall_score: int
    overall_label: str
    grade: str
    axes: list[HealthAxis]
    computed_at: datetime
    streak_days: int
    badges: list[str]


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class HealthScoreService:

    _WEIGHTS = {
        "savings_rate": 0.25,
        "budget_adherence": 0.25,
        "spending_stability": 0.20,
        "debt_to_income": 0.15,
        "emergency_buffer": 0.15,
    }

    async def compute(
        self,
        db,   # ✅ no AsyncSession typing — sync session is injected
        user_id: int,
        monthly_income: float = 0.0,
        savings_balance: float = 0.0,
        monthly_debt_payments: float = 0.0,
    ) -> FinancialHealthReport:

        today = date.today()
        month_start = today.replace(day=1)

        expenses = await self._fetch_monthly_expenses(db, user_id, month_start)
        budgets = await self._fetch_budgets(db, user_id)
        daily_totals = self._daily_totals(expenses)

        total_spent = sum(expenses.values()) if expenses else 0.0

        axes = [
            self._savings_rate_axis(monthly_income, total_spent),
            self._budget_adherence_axis(expenses, budgets),
            self._spending_stability_axis(daily_totals),
            self._debt_to_income_axis(monthly_income, monthly_debt_payments),
            self._emergency_buffer_axis(savings_balance, total_spent),
        ]

        overall = self._weighted_overall(axes)
        label, grade = self._label_and_grade(overall)
        streak = await self._compute_streak(db, user_id, today)
        badges = self._award_badges(axes, overall, streak)

        return FinancialHealthReport(
            overall_score=overall,
            overall_label=label,
            grade=grade,
            axes=axes,
            computed_at=datetime.utcnow(),
            streak_days=streak,
            badges=badges,
        )

    # ------------------------------------------------------------------
    # Axis calculators
    # ------------------------------------------------------------------

    def _savings_rate_axis(self, income: float, spent: float) -> HealthAxis:
        if income <= 0:
            return HealthAxis(
                name="Savings Rate",
                score=50,
                label="Unknown",
                insight="Add income transactions to calculate savings rate.",
                icon="💰",
            )

        rate = max(0.0, (income - spent) / income * 100)
        score = min(100, int(rate * 5))  # 20% → 100

        return HealthAxis(
            name="Savings Rate",
            score=score,
            label=self._score_label(score),
            insight=f"You're saving {rate:.1f}% of your income this month.",
            icon="💰",
        )

    def _budget_adherence_axis(
        self, expenses: dict[str, float], budgets: dict[str, float]
    ) -> HealthAxis:

        if not budgets:
            return HealthAxis(
                name="Budget Adherence",
                score=50,
                label="No Budgets Set",
                insight="Set budgets to track performance.",
                icon="🎯",
            )

        scores = []

        for cat, budget in budgets.items():
            spent = expenses.get(cat, 0.0)

            if budget > 0:
                ratio = spent / budget
                score = max(0, int((1 - max(0, ratio - 1)) * 100))
                scores.append(score)

        avg_score = int(statistics.mean(scores)) if scores else 50

        return HealthAxis(
            name="Budget Adherence",
            score=avg_score,
            label=self._score_label(avg_score),
            insight="Tracks how well you stay within budgets.",
            icon="🎯",
        )

    def _spending_stability_axis(self, daily_totals: list[float]) -> HealthAxis:

        if len(daily_totals) < 5:
            return HealthAxis(
                name="Spending Stability",
                score=50,
                label="Insufficient Data",
                insight="Need more data.",
                icon="📊",
            )

        mean = statistics.mean(daily_totals)
        std = statistics.stdev(daily_totals) if len(daily_totals) > 1 else 0

        cv = (std / mean * 100) if mean > 0 else 0
        score = max(0, int(100 - cv * 0.7))

        return HealthAxis(
            name="Spending Stability",
            score=score,
            label=self._score_label(score),
            insight=f"Spending variation: {cv:.0f}%",
            icon="📊",
        )

    def _debt_to_income_axis(self, income: float, debt: float) -> HealthAxis:

        if income <= 0 or debt <= 0:
            return HealthAxis(
                name="Debt-to-Income",
                score=85,
                label="Good",
                insight="No debt recorded.",
                icon="⚖️",
            )

        dti = debt / income * 100

        if dti < 15:
            score = 100
        elif dti < 28:
            score = 80
        elif dti < 36:
            score = 55
        else:
            score = max(0, int(100 - dti))

        return HealthAxis(
            name="Debt-to-Income",
            score=score,
            label=self._score_label(score),
            insight=f"DTI: {dti:.1f}%",
            icon="⚖️",
        )

    def _emergency_buffer_axis(self, savings: float, expenses: float) -> HealthAxis:

        if expenses <= 0:
            return HealthAxis(
                name="Emergency Buffer",
                score=50,
                label="Unknown",
                insight="No expense data.",
                icon="🛡️",
            )

        months = savings / expenses
        score = min(100, int(months / 6 * 100))

        return HealthAxis(
            name="Emergency Buffer",
            score=score,
            label=self._score_label(score),
            insight=f"{months:.1f} months covered",
            icon="🛡️",
        )

    # ------------------------------------------------------------------
    # Aggregation
    # ------------------------------------------------------------------

    def _weighted_overall(self, axes: list[HealthAxis]) -> int:

        mapping = {
            "Savings Rate": "savings_rate",
            "Budget Adherence": "budget_adherence",
            "Spending Stability": "spending_stability",
            "Debt-to-Income": "debt_to_income",
            "Emergency Buffer": "emergency_buffer",
        }

        total = 0

        for axis in axes:
            key = mapping.get(axis.name)
            if key:
                total += axis.score * self._WEIGHTS[key]

        return int(total)

    # ------------------------------------------------------------------
    # Streak
    # ------------------------------------------------------------------

    async def _compute_streak(
        self, db, user_id: int, today: date
    ) -> int:

        stmt = (
            select(func.date(Transaction.date))
            .where(Transaction.user_id == user_id)
            .where(Transaction.date >= today - timedelta(days=365))
            .group_by(func.date(Transaction.date))
            .order_by(func.date(Transaction.date).desc())
        )

        result = db.execute(stmt)   # ✅ no await
        rows = result.scalars().all()

        days = {r if isinstance(r, date) else r.date() for r in rows}

        streak = 0
        check = today

        while check in days:
            streak += 1
            check -= timedelta(days=1)

        return streak

    # ------------------------------------------------------------------
    # DB helpers (FIXED — sync db.execute, no await)
    # ------------------------------------------------------------------

    async def _fetch_monthly_expenses(
        self, db, user_id: int, month_start: date
    ) -> dict[str, float]:

        stmt = (
            select(Transaction.category, func.sum(Transaction.amount))
            .where(Transaction.user_id == user_id)
            .where(Transaction.type == TransactionType.EXPENSE)
            .where(func.date(Transaction.date) >= month_start)
            .group_by(Transaction.category)
        )

        result = db.execute(stmt)   # ✅ no await
        rows = result.all()

        return {r[0]: float(r[1]) for r in rows}

    async def _fetch_budgets(
        self, db, user_id: int
    ) -> dict[str, float]:

        today = date.today()

        stmt = (
            select(Budget.category, Budget.amount)
            .where(Budget.user_id == user_id)
            .where(Budget.month == today.month)
            .where(Budget.year == today.year)
        )

        result = db.execute(stmt)   # ✅ no await
        rows = result.all()

        return {r[0]: float(r[1]) for r in rows}

    # ------------------------------------------------------------------

    @staticmethod
    def _daily_totals(expenses_by_category: dict[str, float]) -> list[float]:
        return list(expenses_by_category.values())

    @staticmethod
    def _score_label(score: int) -> str:
        if score >= 80:
            return "Excellent"
        if score >= 60:
            return "Good"
        if score >= 40:
            return "Fair"
        return "Poor"

    @staticmethod
    def _label_and_grade(score: int) -> tuple[str, str]:
        if score >= 85:
            return "Excellent", "A"
        if score >= 70:
            return "Good", "B"
        if score >= 55:
            return "Fair", "C"
        if score >= 40:
            return "Needs Attention", "D"
        return "Critical", "F"

    def _award_badges(
        self, axes: list[HealthAxis], overall: int, streak: int
    ) -> list[str]:

        badges = []
        axis_map = {a.name: a.score for a in axes}

        if axis_map.get("Savings Rate", 0) >= 80:
            badges.append("💰 Super Saver")
        if overall >= 85:
            badges.append("⭐ Financial Star")
        if streak >= 7:
            badges.append(f"🔥 {streak}-Day Streak")

        return badges