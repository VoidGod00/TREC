"""
TREC — Predictive Budgeting Service ("Crystal Ball")
"""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from typing import Optional

import google.generativeai as genai
import pandas as pd
from prophet import Prophet
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.transaction import Transaction, TransactionType


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
    burnout_date: Optional[date]
    ai_narrative: str
    confidence: float


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class PredictiveBudgetingService:

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
        transactions = await self._fetch_transactions(db, user_id, 180)

        if len(transactions) < 10:
            return self._fallback_prediction(today, "Not enough transaction history.")

        df = self._to_dataframe(transactions)

        if df.empty:
            return self._fallback_prediction(today, "No expense data available.")

        category_forecasts, total_predicted = self._forecast_categories(
            df, today, monthly_budgets or {}
        )

        total_spent = float(
            df[df["ds"] >= pd.Timestamp(today.replace(day=1))]["y"].sum()
        )

        income_est = monthly_income or 0.0
        predicted_savings = income_est - total_predicted
        savings_rate = (predicted_savings / income_est * 100) if income_est > 0 else 0.0

        burnout = self._estimate_burnout(df, income_est)

        narrative = await self._generate_narrative(
            today,
            total_spent,
            total_predicted,
            income_est,
            predicted_savings,
            savings_rate,
            category_forecasts,
            burnout,
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
    # FIXED: Data fetching
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

        result = await db.execute(stmt)

        # ✅ FIX: avoid ChunkedIteratorResult issues
        rows = result.mappings().all()

        return [
            {
                "date": r["date"],
                "amount": float(r["amount"]),
                "category": r["category"],
                "type": r["type"],
            }
            for r in rows
        ]

    # ------------------------------------------------------------------
    # Forecasting
    # ------------------------------------------------------------------

    def _to_dataframe(self, transactions: list[dict]) -> pd.DataFrame:
        expenses = [t for t in transactions if t["type"] == TransactionType.EXPENSE]

        if not expenses:
            return pd.DataFrame(columns=["ds", "y", "category"])

        df = pd.DataFrame(expenses)
        df["ds"] = pd.to_datetime(df["date"])
        df["y"] = df["amount"].abs()

        return df

    def _forecast_categories(
        self,
        df: pd.DataFrame,
        today: date,
        budgets: dict[str, float],
    ):
        month_start = pd.Timestamp(today.replace(day=1))
        days_left = self._days_left(today)

        forecasts = []
        total_predicted = 0.0

        for category, group in df.groupby("category"):
            daily = group.groupby("ds")["y"].sum().reset_index()

            if len(daily) < 7:
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
                    overspend_amount=round(overspend_amt, 2)
                    if overspend_amt
                    else None,
                )
            )

        forecasts.sort(key=lambda x: x.predicted_month_total, reverse=True)
        return forecasts, total_predicted

    @staticmethod
    def _prophet_remaining(daily: pd.DataFrame, days_left: int) -> float:
        try:
            model = Prophet(
                yearly_seasonality=False,
                weekly_seasonality=True,
                daily_seasonality=False,
            )
            model.fit(daily)

            future = model.make_future_dataframe(periods=days_left)
            forecast = model.predict(future)

            return float(
                forecast.tail(days_left)["yhat"].clip(lower=0).sum()
            )
        except Exception:
            return float(daily["y"].tail(14).mean() * days_left)

    # ------------------------------------------------------------------

    def _estimate_burnout(
        self, df: pd.DataFrame, monthly_income: float
    ) -> Optional[date]:

        if monthly_income <= 0:
            return None

        daily_avg = df["y"].mean()

        if daily_avg <= 0:
            return None

        days = int(monthly_income / daily_avg)
        return date.today() + timedelta(days=days)

    # ------------------------------------------------------------------

    async def _generate_narrative(
        self,
        today,
        spent,
        predicted,
        income,
        savings,
        savings_rate,
        forecasts,
        burnout,
    ) -> str:

        try:
            resp = await self._gemini.generate_content_async(
                f"Summarize spending: spent {spent}, predicted {predicted}",
            )
            return resp.text.strip()
        except Exception:
            return "Financial summary unavailable."

    # ------------------------------------------------------------------

    @staticmethod
    def _days_left(today: date) -> int:
        next_month = today.replace(day=28) + timedelta(days=4)
        last_day = next_month - timedelta(days=next_month.day)
        return (last_day - today).days

    @staticmethod
    def _overall_confidence(n: int) -> float:
        if n >= 100:
            return 0.9
        if n >= 50:
            return 0.75
        if n >= 20:
            return 0.6
        return 0.4

    def _fallback_prediction(self, today: date, reason: str):
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