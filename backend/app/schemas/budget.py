from pydantic import BaseModel, Field
from app.models.transaction import Category

class BudgetCreate(BaseModel):
    category: Category
    limit_amount: float = Field(..., gt=0)
    # We'll default to current month/year in the service if not provided
    month: int = Field(default=None, ge=1, le=12)
    year: int = Field(default=None)

class BudgetResponse(BaseModel):
    id: int
    category: Category
    limit_amount: float
    month: int
    year: int

    class Config:
        from_attributes = True