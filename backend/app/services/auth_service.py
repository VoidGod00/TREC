from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status

from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.config import settings
from app.core.logging import logger


class AuthService:

    def register(self, db: Session, data: UserRegister) -> User:
        # Check duplicate email
        existing = db.query(User).filter(User.email == data.email.lower()).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )

        user = User(
            name=data.name.strip(),
            email=data.email.lower(),
            hashed_password=hash_password(data.password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        logger.info("user_registered", user_id=user.id, email=user.email)
        return user

    def login(self, db: Session, data: UserLogin) -> TokenResponse:
        user = db.query(User).filter(User.email == data.email.lower()).first()

        # Check lockout
        if user and user.locked_until and user.locked_until > datetime.now(timezone.utc):
            remaining = (user.locked_until - datetime.now(timezone.utc)).seconds // 60
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account locked. Try again in {remaining} minutes."
            )

        if not user or not verify_password(data.password, user.hashed_password):
            if user:
                user.failed_login_attempts += 1
                if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
                    user.locked_until = datetime.now(timezone.utc) + timedelta(
                        minutes=settings.LOCKOUT_DURATION_MINUTES
                    )
                    logger.warning("account_locked", user_id=user.id)
                db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated"
            )

        # Reset failed attempts on success
        user.failed_login_attempts = 0
        user.locked_until = None
        db.commit()

        token_data = {"sub": str(user.id)}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        logger.info("user_logged_in", user_id=user.id)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    def refresh(self, db: Session, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

        token_data = {"sub": str(user.id)}
        return TokenResponse(
            access_token=create_access_token(token_data),
            refresh_token=create_refresh_token(token_data),
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    def get_user_by_id(self, db: Session, user_id: int) -> User:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user
