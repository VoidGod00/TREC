from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.analytics import AIQuestion, AIResponse
from app.services.ai_service import AIService
from app.models.budget import AILog
from app.core.security import get_current_user_id
from app.core.logging import logger
from pydantic import BaseModel

router = APIRouter(prefix="/ai", tags=["AI Assistant"])
service = AIService()


class CategorizeRequest(BaseModel):
    description: str


class AILogResponse(BaseModel):
    id: int
    question: str
    response: str
    model_used: str
    tokens_used: int | None

    class Config:
        from_attributes = True


@router.post("/ask", response_model=AIResponse)
def ask_ai(
    data: AIQuestion,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Ask the AI assistant a question about your finances."""
    if not data.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    if len(data.question) > 1000:
        raise HTTPException(status_code=400, detail="Question too long (max 1000 chars)")
    return service.ask(db, user_id, data.question)


@router.post("/categorize")
def categorize_transaction(
    data: CategorizeRequest,
    user_id: int = Depends(get_current_user_id),
):
    """Auto-categorize a transaction description using AI."""
    category = service.auto_categorize(data.description)
    return {"category": category}


@router.get("/insights")
def get_insights(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get AI-generated proactive spending insights."""
    insights = service.generate_insights(db, user_id)
    return {"insights": insights}


@router.get("/history", response_model=List[AILogResponse])
def get_ai_history(
    limit: int = 20,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get conversation history with AI assistant."""
    return db.query(AILog).filter(
        AILog.user_id == user_id
    ).order_by(AILog.created_at.desc()).limit(limit).all()
