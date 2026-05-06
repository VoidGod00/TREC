"""
TREC — Predictive Budgeting Service  ("Crystal Ball")
Uses Facebook Prophet for time-series forecasting and Gemini to narrate the
prediction in plain English with actionable advice.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional

import google.generativeai as genai
import pandas as pd
from prophet import Prophet  # pip install prophet
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import logger
from app.models.transaction import Transaction, TransactionType  # existing model



genai.configure(api_key=settings.GEMINI_API_KEY)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class CategoryForecast(BaseModel):
    category: str
    current_month_spent: float
    predicted_month_total: float
    monthly_budget: Optional[float]
    overspend_risk: bool
    overspend_amount: Optional[float]


class BudgetPrediction(BaseModel):
    forecast_date: date
    days_remaining_in_month: int
    total_spent_so_far: float
    predicted_month_total: float
    monthly_income_estimate: float
    predicted_savings: float
    savings_rate_pct: float
    category_forecasts: list[CategoryForecast]
    burnout_date: Optional[date]  # estimated date funds run out
    ai_narrative: str
    confidence: float  # 0-1


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class PredictiveBudgetingService:
    """
    Forecasts end-of-month spending per category using Prophet,
    then has Gemini write a natural-language interpretation.

    Usage in a route:
        svc = PredictiveBudgetingService()
        prediction = await svc.predict(db_session, user_id=42, monthly_budgets={...})
    """

    def __init__(self, model_name: str = "gemini-2.5-flash"):
        self._gemini = genai.GenerativeModel(model_name)

    async def predict(
        self,
        db: AsyncSession,
        user_id: int,
        monthly_budgets: dict[str, float] | None = None,
        monthly_income: float | None = None,
    ) -> BudgetPrediction:
        today = date.today()
        transactions = await self._fetch_transactions(db, user_id, lookback_days=180)

        if len(transactions) < 10:
            return self._fallback_prediction(today, "Not enough transaction history.")

        df = self._to_dataframe(transactions)
        category_forecasts, total_predicted = self._forecast_categories(
            df, today, monthly_budgets or {}
        )

        total_spent = float(
            df[df["ds"] >= pd.Timestamp(today.replace(day=1))]["y"].sum()
        )

        income_est = monthly_income or self._estimate_income(df)
        predicted_savings = income_est - total_predicted
        savings_rate = (predicted_savings / income_est * 100) if income_est > 0 else 0.0

        burnout = self._estimate_burnout(df, income_est)
        narrative = await self._generate_narrative(
            today, total_spent, total_predicted, income_est,
            predicted_savings, savings_rate, category_forecasts, burnout
        )

        return BudgetPrediction(
            forecast_date=today,
            days_remaining_in_month=self._days_left(today),
            total_spent_so_far=round(total_spent, 2),
            predicted_month_total=round(total_predicted, 2),
            monthly_income_estimate=round(income_est, 2),
            predicted_savings=round(predicted_savings, 2),
            savings_rate_pct=round(savings_rate, 1),
            category_forecasts=category_forecasts,
            burnout_date=burnout,
            ai_narrative=narrative,
            confidence=self._overall_confidence(len(transactions)),
        )

    # ------------------------------------------------------------------
    # Data fetching
    # ------------------------------------------------------------------

    async def _fetch_transactions(
        self, db: AsyncSession, user_id: int, lookback_days: int
    ) -> list[dict]:
        cutoff = datetime.now() - timedelta(days=lookback_days)
        stmt = (
            select(
                Transaction.date,
                Transaction.amount,
                Transaction.category,
                Transaction.type,
            )
            .where(Transaction.user_id == user_id)
            .where(Transaction.date >= cutoff)
            .order_by(Transaction.date)
        )
        rows = (await db.execute(stmt)).fetchall()
        return [
            {
                "date": r.date,
                "amount": float(r.amount),
                "category": r.category,
                "type": r.type,
            }
            for r in rows
        ]

    # ------------------------------------------------------------------
    # Forecasting
    # ------------------------------------------------------------------

    def _to_dataframe(self, transactions: list[dict]) -> pd.DataFrame:
        expenses = [t for t in transactions if t["type"] == TransactionType.EXPENSE]
        df = pd.DataFrame(expenses)
        df["ds"] = pd.to_datetime(df["date"])
        df["y"] = df["amount"].abs()
        return df

    def _forecast_categories(
        self,
        df: pd.DataFrame,
        today: date,
        budgets: dict[str, float],
    ) -> tuple[list[CategoryForecast], float]:
        month_start = pd.Timestamp(today.replace(day=1))
        days_left = self._days_left(today)
        forecasts: list[CategoryForecast] = []
        total_predicted = 0.0

        for category, group in df.groupby("category"):
            daily = group.groupby("ds")["y"].sum().reset_index()

            if len(daily) < 7:
                # Too little data — use simple daily average
                daily_avg = daily["y"].mean()
                pred_remaining = daily_avg * days_left
            else:
                pred_remaining = self._prophet_remaining(daily, days_left)

            spent_this_month = float(
                group[group["ds"] >= month_start]["y"].sum()
            )
            predicted_total = spent_this_month + pred_remaining
            total_predicted += predicted_total

            budget = budgets.get(category)
            overspend = predicted_total > budget if budget else False
            overspend_amt = (predicted_total - budget) if overspend else None

            forecasts.append(
                CategoryForecast(
                    category=str(category),
                    current_month_spent=round(spent_this_month, 2),
                    predicted_month_total=round(predicted_total, 2),
                    monthly_budget=budget,
                    overspend_risk=overspend,
                    overspend_amount=round(overspend_amt, 2) if overspend_amt else None,
                )
            )

        forecasts.sort(key=lambda x: x.predicted_month_total, reverse=True)
        return forecasts, total_predicted

    @staticmethod
    def _prophet_remaining(daily: pd.DataFrame, days_left: int) -> float:
        """Run Prophet on daily spend series; return sum for remaining days."""
        try:
            model = Prophet(
                yearly_seasonality=False,
                weekly_seasonality=True,
                daily_seasonality=False,
                changepoint_prior_scale=0.1,
            )
            model.fit(daily, iter=300)

            future = model.make_future_dataframe(periods=days_left, freq="D")
            forecast = model.predict(future)
            remaining = forecast.tail(days_left)["yhat"].clip(lower=0).sum()
            return float(remaining)
        except Exception:
            # Graceful fallback to rolling average
            return float(daily["y"].tail(14).mean() * days_left)

    # ------------------------------------------------------------------
    # Income estimation
    # ------------------------------------------------------------------

    def _estimate_income(self, df_all: pd.DataFrame) -> float:
        """
        We don't have a dedicated income flag in this example, so we estimate
        from the user's transaction data (income transactions have type INCOME).
        This is plugged in from the caller when available.
        """
        return 0.0  # caller should pass monthly_income if available

    # ------------------------------------------------------------------
    # Burn-out date
    # ------------------------------------------------------------------

    def _estimate_burnout(
        self, df: pd.DataFrame, monthly_income: float
    ) -> Optional[date]:
        if monthly_income <= 0:
            return None
        daily_avg = df["y"].mean()
        if daily_avg <= 0:
            return None
        days_of_runway = int(monthly_income / daily_avg)
        return date.today() + timedelta(days=days_of_runway)

    # ------------------------------------------------------------------
    # Gemini narrative
    # ------------------------------------------------------------------

    async def _generate_narrative(
        self,
        today: date,
        spent: float,
        predicted: float,
        income: float,
        savings: float,
        savings_rate: float,
        forecasts: list[CategoryForecast],
        burnout: Optional[date],
    ) -> str:
        risky = [f for f in forecasts if f.overspend_risk]
        risky_summary = "\n".join(
            f"  - {f.category}: projected ${f.predicted_month_total:.0f} "
            f"vs ${f.monthly_budget:.0f} budget (+${f.overspend_amount:.0f} over)"
            for f in risky
        ) or "  None — all categories within budget."

        prompt = f"""
You are TREC, a sharp and friendly personal finance AI. Today is {today}.

Here is the user's financial forecast for this month:
- Spent so far: ${spent:.2f}
- Predicted month total: ${predicted:.2f}
- Estimated monthly income: ${income:.2f}
- Predicted savings: ${savings:.2f} ({savings_rate:.1f}%)
- Days remaining: {self._days_left(today)}
- Categories at risk of overspending:
{risky_summary}
- Estimated days until funds depleted (if no income considered): {(burnout - today).days if burnout else 'N/A'} days

Write a concise 3-4 sentence financial health update. Be specific (use the numbers), direct, and actionable.
If things look good, say so. If there's a risk, be clear about what it is and suggest one fix.
Do NOT use bullet points. Write in flowing, human prose.
"""
        try:
            resp = await self._gemini.generate_content_async(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.4, max_output_tokens=300
                ),
            )
            return resp.text.strip()
        except Exception:
            return (
                f"You've spent ${spent:.0f} so far this month and are projected to reach "
                f"${predicted:.0f} by month end. "
                + ("You're on track to save money." if savings >= 0 else
                   f"You may overspend by ${abs(savings):.0f}. Consider reducing discretionary spending.")
            )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _days_left(today: date) -> int:
        next_month = today.replace(day=28) + timedelta(days=4)
        last_day = next_month - timedelta(days=next_month.day)
        return (last_day - today).days

    @staticmethod
    def _overall_confidence(n_transactions: int) -> float:
        if n_transactions >= 100:
            return 0.9
        if n_transactions >= 50:
            return 0.75
        if n_transactions >= 20:
            return 0.6
        return 0.4

    def _fallback_prediction(self, today: date, reason: str) -> BudgetPrediction:
        return BudgetPrediction(
            forecast_date=today,
            days_remaining_in_month=self._days_left(today),
            total_spent_so_far=0.0,
            predicted_month_total=0.0,
            monthly_income_estimate=0.0,
            predicted_savings=0.0,
            savings_rate_pct=0.0,
            category_forecasts=[],
            burnout_date=None,
            ai_narrative=reason,
            confidence=0.0,
        )
