
from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user_id  # existing dependency
from app.database import get_db  # existing dependency
from app.models.user import User  # existing model
from app.services.receipt_scanner_service import ReceiptScannerService, ScannedReceipt
from app.services.predictive_budgeting_service import (
    BudgetPrediction,
    PredictiveBudgetingService,
)
from app.services.health_score_service import FinancialHealthReport, HealthScoreService

smart_router = APIRouter(tags=["Smart Features"])

# Singleton services (stateless — safe to reuse)
_receipt_scanner = ReceiptScannerService()
_budgeting_svc = PredictiveBudgetingService()
_health_svc = HealthScoreService()


# ---------------------------------------------------------------------------
# Receipt Scanner
# ---------------------------------------------------------------------------


@smart_router.post(
    "/receipts/scan",
    response_model=ScannedReceipt,
    summary="Scan a receipt image with Gemini Vision",
    description=(
        "Upload a JPEG/PNG/WebP photo of a receipt. "
        "Gemini Vision will extract merchant, date, items, and total. "
        "Max file size: 10 MB."
    ),
)
async def scan_receipt(
    file: Annotated[UploadFile, File(description="Receipt image (JPEG/PNG/WebP/HEIC)")],
    user_id: int = Depends(get_current_user_id)
) -> ScannedReceipt:
    return await _receipt_scanner.scan_receipt(file)


# ---------------------------------------------------------------------------
# Predictive Budgeting
# ---------------------------------------------------------------------------


@smart_router.get(
    "/analytics/forecast",
    response_model=BudgetPrediction,
    summary="Predict end-of-month spending with Crystal Ball",
    description=(
        "Uses Prophet time-series forecasting to predict end-of-month totals "
        "per category, then Gemini interprets the results in plain English."
    ),
)
async def get_budget_forecast(
    monthly_income: float = Query(0.0, ge=0, description="Your total monthly income"),
    savings_balance: float = Query(0.0, ge=0, description="Current savings account balance"),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    ) -> BudgetPrediction:
        return await _budgeting_svc.predict(
            db=db,
            user_id=user_id,
        monthly_income=monthly_income,
    )


# ---------------------------------------------------------------------------
# Financial Health Score
# ---------------------------------------------------------------------------


@smart_router.get(
    "/analytics/health-score",
    response_model=FinancialHealthReport,
    summary="Compute Financial Health Score (radar chart data)",
    description=(
        "Returns a 0-100 score for 5 financial health axes: "
        "Savings Rate, Budget Adherence, Spending Stability, "
        "Debt-to-Income, and Emergency Buffer. "
        "Use the axes array directly in a Recharts RadarChart."
    ),
)
async def get_health_score(
    monthly_income: float = Query(0.0, ge=0),
    savings_balance: float = Query(0.0, ge=0),
    monthly_debt_payments: float = Query(0.0, ge=0),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    ) -> FinancialHealthReport:
        return await _health_svc.compute(
            db=db,
            user_id=user_id,
        monthly_income=monthly_income,
        savings_balance=savings_balance,
        monthly_debt_payments=monthly_debt_payments,
    )
