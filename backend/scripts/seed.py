#!/usr/bin/env python3
"""
Seed script — populates the DB with realistic sample data for development.
Usage: python scripts/seed.py
"""
import sys, os, random
from decimal import Decimal
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.database import SessionLocal, Base, engine
from app.models import User, Transaction, Budget, AILog
from app.models.transaction import TransactionType, Category
from app.core.security import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

def seed():
    print("🌱 Seeding database...")

    # Clean existing seed data
    db.query(AILog).delete()
    db.query(Budget).delete()
    db.query(Transaction).delete()
    db.query(User).filter(User.email == "demo@trec.com").delete()
    db.commit()

    # Create demo user
    user = User(
        name="Demo User",
        email="demo@trec.com",
        hashed_password=hash_password("Demo@1234"),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"  ✅ Created user: demo@trec.com / Demo@1234")

    # Salary entries
    for month in range(1, 7):
        db.add(Transaction(
            user_id=user.id,
            amount=Decimal("65000.00"),
            category=Category.SALARY,
            type=TransactionType.INCOME,
            date=datetime(2024, month, 1, tzinfo=timezone.utc),
            note="Monthly salary",
            merchant="Employer Ltd",
        ))

    # Expense patterns
    expense_patterns = [
        (Category.RENT,          Decimal("18000"), "Rent payment",    "Landlord",         False),
        (Category.FOOD,          None,             "Groceries",       "BigBasket",        False),
        (Category.FOOD,          None,             "Dining out",      "Zomato",           False),
        (Category.TRANSPORT,     Decimal("2500"),  "Monthly pass",    "Metro",            True),
        (Category.UTILITIES,     Decimal("1800"),  "Electricity",     "Power Board",      True),
        (Category.UTILITIES,     Decimal("499"),   "Internet",        "Jio Fiber",        True),
        (Category.ENTERTAINMENT, None,             "OTT subscription","Netflix",          True),
        (Category.HEALTHCARE,    None,             "Pharmacy",        "MedPlus",          False),
        (Category.SHOPPING,      None,             "Online shopping", "Amazon",           False),
        (Category.EDUCATION,     Decimal("2999"),  "Course fee",      "Udemy",            True),
    ]

    for month in range(1, 7):
        for cat, fixed_amount, note, merchant, recurring in expense_patterns:
            amount = fixed_amount if fixed_amount else Decimal(str(random.randint(500, 5000)))
            day = random.randint(1, 28)
            db.add(Transaction(
                user_id=user.id,
                amount=amount,
                category=cat,
                type=TransactionType.EXPENSE,
                date=datetime(2024, month, day, tzinfo=timezone.utc),
                note=note,
                merchant=merchant,
                is_recurring=recurring,
            ))

    db.commit()

    # Budgets for current month
    budgets = [
        (Category.FOOD, Decimal("8000")),
        (Category.RENT, Decimal("20000")),
        (Category.TRANSPORT, Decimal("3000")),
        (Category.ENTERTAINMENT, Decimal("1500")),
        (Category.SHOPPING, Decimal("5000")),
    ]
    for cat, limit in budgets:
        db.add(Budget(user_id=user.id, category=cat, limit_amount=limit, month=6, year=2024))

    db.commit()

    total_tx = db.query(Transaction).filter(Transaction.user_id == user.id).count()
    print(f"  ✅ Created {total_tx} transactions across 6 months")
    print(f"  ✅ Created {len(budgets)} budgets")
    print("\n✨ Seeding complete!")
    print("   Login: demo@trec.com / Demo@1234")

seed()
db.close()
