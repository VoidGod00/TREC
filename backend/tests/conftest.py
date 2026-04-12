import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from decimal import Decimal
from datetime import datetime, timezone

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.models.transaction import Transaction, TransactionType, Category
from app.core.security import hash_password, create_access_token

# ─── Test Database ─────────────────────────────────────────────────────────────

TEST_DATABASE_URL = "sqlite:///./test.db"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=test_engine)
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ─── Factories ─────────────────────────────────────────────────────────────────

@pytest.fixture
def test_user(db) -> User:
    user = User(
        name="Test User",
        email="test@trec.com",
        hashed_password=hash_password("Test@1234"),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user) -> dict:
    token = create_access_token({"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_transaction(db, test_user) -> Transaction:
    tx = Transaction(
        user_id=test_user.id,
        amount=Decimal("500.00"),
        category=Category.FOOD,
        type=TransactionType.EXPENSE,
        date=datetime.now(timezone.utc),
        note="Test food expense",
        merchant="Test Restaurant",
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@pytest.fixture
def multiple_transactions(db, test_user) -> list:
    """Create a set of varied transactions for analytics testing."""
    txs = [
        Transaction(user_id=test_user.id, amount=Decimal("5000.00"), category=Category.SALARY,
                    type=TransactionType.INCOME, date=datetime(2024, 1, 1, tzinfo=timezone.utc)),
        Transaction(user_id=test_user.id, amount=Decimal("800.00"), category=Category.FOOD,
                    type=TransactionType.EXPENSE, date=datetime(2024, 1, 5, tzinfo=timezone.utc)),
        Transaction(user_id=test_user.id, amount=Decimal("1200.00"), category=Category.RENT,
                    type=TransactionType.EXPENSE, date=datetime(2024, 1, 10, tzinfo=timezone.utc)),
        Transaction(user_id=test_user.id, amount=Decimal("300.00"), category=Category.TRANSPORT,
                    type=TransactionType.EXPENSE, date=datetime(2024, 1, 15, tzinfo=timezone.utc),
                    is_recurring=True),
        Transaction(user_id=test_user.id, amount=Decimal("200.00"), category=Category.ENTERTAINMENT,
                    type=TransactionType.EXPENSE, date=datetime(2024, 1, 20, tzinfo=timezone.utc)),
    ]
    for tx in txs:
        db.add(tx)
    db.commit()
    for tx in txs:
        db.refresh(tx)
    return txs
