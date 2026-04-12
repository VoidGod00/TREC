from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.schemas.analytics import AnalyticsDashboard, BudgetCreate, BudgetResponse
from app.services.analytics_service import AnalyticsService
from app.models.budget import Budget
from app.core.security import get_current_user_id
from typing import List

router = APIRouter(prefix="/analytics", tags=["Analytics"])
service = AnalyticsService()


@router.get("/dashboard", response_model=AnalyticsDashboard)
def get_dashboard(
    year: int = Query(default=datetime.now().year),
    month: int = Query(default=datetime.now().month, ge=1, le=12),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get full analytics dashboard for a given month."""
    return service.get_dashboard(db, user_id, year, month)


@router.post("/budgets", response_model=BudgetResponse, status_code=201)
def create_budget(
    data: BudgetCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    from app.models.transaction import Category
    
    # Check if budget for this category/month already exists
    existing_budget = db.query(Budget).filter(
        Budget.user_id == user_id,
        Budget.category == Category(data.category),
        Budget.month == data.month,
        Budget.year == data.year
    ).first()

    if existing_budget:
        existing_budget.limit_amount = data.limit_amount
        db.commit()
        db.refresh(existing_budget)
        return existing_budget

    # Otherwise, create new
    budget = Budget(
        user_id=user_id,
        category=Category(data.category),
        limit_amount=data.limit_amount,
        month=data.month,
        year=data.year,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget

@router.get("/budgets", response_model=List[BudgetResponse])
def get_budgets(
    year: int = Query(default=datetime.now().year),
    month: int = Query(default=datetime.now().month, ge=1, le=12),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get all budgets for a month."""
    return db.query(Budget).filter(
        Budget.user_id == user_id,
        Budget.year == year,
        Budget.month == month,
    ).all()
