from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Enum, Text, Boolean, func
from sqlalchemy.orm import relationship
import enum
from app.database import Base


class TransactionType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"


class Category(str, enum.Enum):
    FOOD = "food"
    TRANSPORT = "transport"
    RENT = "rent"
    UTILITIES = "utilities"
    ENTERTAINMENT = "entertainment"
    HEALTHCARE = "healthcare"
    SHOPPING = "shopping"
    TRAVEL = "travel"
    EDUCATION = "education"
    SAVINGS = "savings"
    SALARY = "salary"
    FREELANCE = "freelance"
    INVESTMENT = "investment"
    OTHER = "other"


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    category = Column(Enum(Category), nullable=False, index=True)
    type = Column(Enum(TransactionType), nullable=False, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    note = Column(Text, nullable=True)
    merchant = Column(String(255), nullable=True)
    is_recurring = Column(Boolean, default=False, nullable=False)
    tags = Column(String(500), nullable=True)   # comma-separated
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="transactions")

    def __repr__(self):
        return f"<Transaction id={self.id} amount={self.amount} type={self.type}>"
