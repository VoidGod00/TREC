

from __future__ import annotations

import statistics
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transaction import Transaction, TransactionType  # existing
from app.models.budget import Budget  # existing


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class HealthAxis(BaseModel):
    name: str
    score: int  # 0-100
    label: str  # "Poor" / "Fair" / "Good" / "Excellent"
    insight: str  # one-sentence explanation
    icon: str  # emoji for frontend convenience


class FinancialHealthReport(BaseModel):
    overall_score: int  # 0-100
    overall_label: str
    grade: str  # A / B / C / D / F
    axes: list[HealthAxis]
    computed_at: datetime
    streak_days: int  # consecutive days with at least one transaction logged
    badges: list[str]  # earned badges e.g. "Saver", "Budget Master"


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class HealthScoreService:
    """
    Computes the Financial Health Score for a user.

    Axes (radar chart dimensions):
      1. Savings Rate       — % of income saved this month
      2. Budget Adherence   — how well the user sticks to category budgets
      3. Spending Stability — consistency of daily spending (lower variance = better)
      4. Debt-to-Income     — ratio of debt payments to income
      5. Emergency Buffer   — months of expenses covered by savings balance

    Usage:
        svc = HealthScoreService()
        report = await svc.compute(db, user_id=42, monthly_income=5000, savings_balance=8000)
    """

    # Axis weights must sum to 1.0
    _WEIGHTS = {
        "savings_rate": 0.25,
        "budget_adherence": 0.25,
        "spending_stability": 0.20,
        "debt_to_income": 0.15,
        "emergency_buffer": 0.15,
    }

    async def compute(
        self,
        db: AsyncSession,
        user_id: int,
        monthly_income: float = 0.0,
        savings_balance: float = 0.0,
        monthly_debt_payments: float = 0.0,
    ) -> FinancialHealthReport:
        today = date.today()
        month_start = today.replace(day=1)

        # Fetch data
        expenses = await self._fetch_monthly_expenses(db, user_id, month_start)
        budgets = await self._fetch_budgets(db, user_id)
        daily_totals = self._daily_totals(expenses)

        total_spent = sum(expenses.values()) if expenses else 0.0

        # Compute each axis
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
                name="Savings Rate", score=50,
                label="Unknown", insight="Add income transactions to calculate savings rate.",
                icon="💰",
            )
        rate = max(0.0, (income - spent) / income * 100)
        score = min(100, int(rate * 100 / 20))  # 20% savings = 100 score
        return HealthAxis(
            name="Savings Rate", score=score,
            label=self._score_label(score),
            insight=f"You're saving {rate:.1f}% of your income this month. "
                    + ("Great work!" if rate >= 20 else "Aim for 20%+."),
            icon="💰",
        )

    def _budget_adherence_axis(
        self, expenses: dict[str, float], budgets: dict[str, float]
    ) -> HealthAxis:
        if not budgets:
            return HealthAxis(
                name="Budget Adherence", score=50,
                label="No Budgets Set",
                insight="Set category budgets to track adherence.",
                icon="🎯",
            )
        adherence_scores = []
        for cat, budget in budgets.items():
            spent = expenses.get(cat, 0.0)
            if budget > 0:
                pct_used = spent / budget
                # 0% used = 100, 100% = 100, 120% = 60, 150% = 0
                cat_score = max(0, int((1 - max(0, pct_used - 1.0)) * 100))
                adherence_scores.append(cat_score)

        score = int(statistics.mean(adherence_scores)) if adherence_scores else 50
        over_count = sum(
            1 for c, b in budgets.items() if expenses.get(c, 0) > b
        )
        return HealthAxis(
            name="Budget Adherence", score=score,
            label=self._score_label(score),
            insight=f"{over_count} of {len(budgets)} budget categories exceeded this month."
                    if over_count else "All budget categories within limits this month.",
            icon="🎯",
        )

    def _spending_stability_axis(self, daily_totals: list[float]) -> HealthAxis:
        if len(daily_totals) < 5:
            return HealthAxis(
                name="Spending Stability", score=50, label="Insufficient Data",
                insight="Need at least 5 days of data for stability analysis.", icon="📊",
            )
        mean = statistics.mean(daily_totals)
        std = statistics.stdev(daily_totals) if len(daily_totals) > 1 else 0
        cv = (std / mean * 100) if mean > 0 else 0  # coefficient of variation
        # CV < 30% = excellent, 30-60% = good, 60-100% = fair, >100% = poor
        score = max(0, int(100 - cv * 0.7))
        return HealthAxis(
            name="Spending Stability", score=score,
            label=self._score_label(score),
            insight=f"Your daily spending varies by {cv:.0f}%. "
                    + ("Very consistent spending habits." if cv < 30 else
                       "Consider smoothing out irregular large purchases."),
            icon="📊",
        )

    def _debt_to_income_axis(self, income: float, debt_payments: float) -> HealthAxis:
        if income <= 0 or debt_payments <= 0:
            return HealthAxis(
                name="Debt-to-Income", score=85, label="Good",
                insight="No debt payments recorded this month.", icon="⚖️",
            )
        dti = debt_payments / income * 100
        # < 15% excellent, 15-28% good, 28-36% fair, >36% poor
        if dti < 15:
            score = 100
        elif dti < 28:
            score = 80
        elif dti < 36:
            score = 55
        else:
            score = max(0, int(100 - dti))
        return HealthAxis(
            name="Debt-to-Income", score=score,
            label=self._score_label(score),
            insight=f"Debt payments are {dti:.1f}% of your income. "
                    + ("Well within healthy range." if dti < 28 else
                       "High debt load — prioritise paying down debt."),
            icon="⚖️",
        )

    def _emergency_buffer_axis(
        self, savings_balance: float, monthly_expenses: float
    ) -> HealthAxis:
        if monthly_expenses <= 0:
            return HealthAxis(
                name="Emergency Buffer", score=50, label="Unknown",
                insight="No expense data to calculate buffer.", icon="🛡️",
            )
        months_covered = savings_balance / monthly_expenses
        # 6+ months = 100, 3 months = 70, 1 month = 40, 0 = 0
        score = min(100, int(months_covered / 6 * 100))
        return HealthAxis(
            name="Emergency Buffer", score=score,
            label=self._score_label(score),
            insight=f"Your savings cover {months_covered:.1f} months of expenses. "
                    + ("Excellent safety net!" if months_covered >= 6 else
                       f"Build towards 6 months ({6 - months_covered:.1f} months to go)."),
            icon="🛡️",
        )

    # ------------------------------------------------------------------
    # Aggregation
    # ------------------------------------------------------------------

    def _weighted_overall(self, axes: list[HealthAxis]) -> int:
        axis_map = {a.name: a.score for a in axes}
        key_map = {
            "Savings Rate": "savings_rate",
            "Budget Adherence": "budget_adherence",
            "Spending Stability": "spending_stability",
            "Debt-to-Income": "debt_to_income",
            "Emergency Buffer": "emergency_buffer",
        }
        total = sum(
            axis_map[name] * weight
            for name, key in key_map.items()
            for w_key, weight in self._WEIGHTS.items()
            if w_key == key
        )
        return int(total)

    # ------------------------------------------------------------------
    # Streak
    # ------------------------------------------------------------------

    async def _compute_streak(
        self, db: AsyncSession, user_id: int, today: date
    ) -> int:
        stmt = (
            select(func.date(Transaction.date))
            .where(Transaction.user_id == user_id)
            .where(Transaction.date >= today - timedelta(days=365))
            .group_by(func.date(Transaction.date))
            .order_by(func.date(Transaction.date).desc())
        )
        rows = (await db.execute(stmt)).scalars().all()
        days_with_tx = {r if isinstance(r, date) else r.date() for r in rows}

        streak = 0
        check = today
        while check in days_with_tx:
            streak += 1
            check -= timedelta(days=1)
        return streak

    # ------------------------------------------------------------------
    # Badges
    # ------------------------------------------------------------------

    def _award_badges(
        self, axes: list[HealthAxis], overall: int, streak: int
    ) -> list[str]:
        badges: list[str] = []
        axis_map = {a.name: a.score for a in axes}

        if axis_map.get("Savings Rate", 0) >= 80:
            badges.append("💰 Super Saver")
        if axis_map.get("Budget Adherence", 0) >= 85:
            badges.append("🎯 Budget Master")
        if axis_map.get("Spending Stability", 0) >= 80:
            badges.append("📊 Steady Spender")
        if axis_map.get("Emergency Buffer", 0) >= 90:
            badges.append("🛡️ Safety Net Pro")
        if overall >= 85:
            badges.append("⭐ Financial Star")
        if streak >= 7:
            badges.append(f"🔥 {streak}-Day Streak")
        if streak >= 30:
            badges.append("🏆 Tracking Champion")

        return badges

    # ------------------------------------------------------------------
    # DB helpers
    # ------------------------------------------------------------------

    async def _fetch_monthly_expenses(
        self, db: AsyncSession, user_id: int, month_start: date
    ) -> dict[str, float]:
        stmt = (
            select(Transaction.category, func.sum(Transaction.amount))
            .where(Transaction.user_id == user_id)
            .where(Transaction.type == TransactionType.EXPENSE)
            .where(func.date(Transaction.date) >= month_start)
            .group_by(Transaction.category)
        )
        rows = (await db.execute(stmt)).fetchall()
        return {r[0]: float(r[1]) for r in rows}

    async def _fetch_budgets(
        self, db: AsyncSession, user_id: int
    ) -> dict[str, float]:
        today = date.today()
        stmt = (
            select(Budget.category, Budget.amount)
            .where(Budget.user_id == user_id)
            .where(Budget.month == today.month)
            .where(Budget.year == today.year)
        )
        rows = (await db.execute(stmt)).fetchall()
        return {r[0]: float(r[1]) for r in rows}

    @staticmethod
    def _daily_totals(expenses_by_category: dict[str, float]) -> list[float]:
        # This is simplified; in production you'd query daily aggregated expenses
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
