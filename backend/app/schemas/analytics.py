from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict
from decimal import Decimal
from datetime import datetime


class CategoryBreakdown(BaseModel):
    category: str
    amount: Decimal
    percentage: float
    count: int


class MonthlyTrend(BaseModel):
    month: str          # "2024-01"
    income: Decimal
    expense: Decimal
    net: Decimal


class BudgetStatus(BaseModel):
    category: str
    budget: Decimal
    spent: Decimal
    remaining: Decimal
    percentage_used: float
    is_over_budget: bool


class AnalyticsDashboard(BaseModel):
    total_income: Decimal
    total_expense: Decimal
    net_savings: Decimal
    savings_rate: float
    top_expense_category: Optional[str]
    category_breakdown: List[CategoryBreakdown]
    monthly_trends: List[MonthlyTrend]
    budget_status: List[BudgetStatus]
    recurring_expenses_total: Decimal
    month_over_month_change: float     # % change vs last month


class AIQuestion(BaseModel):
    question: str


class AIResponse(BaseModel):
    answer: str
    model_used: str
    timestamp: datetime


class BudgetCreate(BaseModel):
    category: str
    limit_amount: Decimal
    month: int
    year: int

    class Config:
        from_attributes = True


class BudgetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: str
    limit_amount: Decimal
    month: int
    year: int
    created_at: datetime
