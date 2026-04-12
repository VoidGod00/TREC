from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Text, Enum, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.transaction import Category


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(Enum(Category), nullable=False)
    limit_amount = Column(Numeric(12, 2), nullable=False)
    month = Column(Integer, nullable=False)   # 1-12
    year = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="budgets")

    def __repr__(self):
        return f"<Budget id={self.id} category={self.category} limit={self.limit_amount}>"


class AILog(Base):
    __tablename__ = "ai_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    model_used = Column(String(100), nullable=False)
    tokens_used = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="ai_logs")

    def __repr__(self):
        return f"<AILog id={self.id} user_id={self.user_id}>"
