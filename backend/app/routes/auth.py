from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import (
    UserRegister, UserLogin, TokenResponse, RefreshTokenRequest,
    UserResponse, PasswordChangeRequest
)
from app.services.auth_service import AuthService
from app.core.security import get_current_user_id, hash_password, verify_password
from app.core.logging import logger

router = APIRouter(prefix="/auth", tags=["Authentication"])
service = AuthService()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account."""
    user = service.register(db, data)
    return user


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Login and get JWT tokens."""
    return service.login(db, data)


@router.post("/refresh", response_model=TokenResponse)
def refresh(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token using refresh token."""
    return service.refresh(db, data.refresh_token)


@router.get("/me", response_model=UserResponse)
def get_me(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Get current user profile."""
    return service.get_user_by_id(db, user_id)


@router.put("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    data: PasswordChangeRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Change user password."""
    user = service.get_user_by_id(db, user_id)
    if not verify_password(data.current_password, user.hashed_password):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    logger.info("password_changed", user_id=user_id)


@router.delete("/deactivate", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_account(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Deactivate current user account."""
    user = service.get_user_by_id(db, user_id)
    user.is_active = False
    db.commit()
    logger.info("account_deactivated", user_id=user_id)
