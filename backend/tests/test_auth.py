import pytest
from fastapi import status
from app.core.security import hash_password, verify_password, create_access_token, decode_token
from app.services.auth_service import AuthService
from app.schemas.auth import UserRegister, UserLogin


# ─── Unit: Security Utilities ─────────────────────────────────────────────────

class TestPasswordHashing:

    def test_hash_password_returns_string(self):
        result = hash_password("Test@1234")
        assert isinstance(result, str)
        assert result != "Test@1234"

    def test_verify_correct_password(self):
        hashed = hash_password("Test@1234")
        assert verify_password("Test@1234", hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("Test@1234")
        assert verify_password("WrongPass@1", hashed) is False

    def test_two_hashes_are_different(self):
        h1 = hash_password("Test@1234")
        h2 = hash_password("Test@1234")
        assert h1 != h2   # bcrypt salts each hash

    def test_empty_password_hashes(self):
        result = hash_password("")
        assert isinstance(result, str)


class TestJWT:

    def test_create_and_decode_access_token(self):
        token = create_access_token({"sub": "42"})
        payload = decode_token(token)
        assert payload["sub"] == "42"
        assert payload["type"] == "access"

    def test_invalid_token_raises(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            decode_token("invalid.token.here")
        assert exc_info.value.status_code == 401

    def test_tampered_token_raises(self):
        from fastapi import HTTPException
        token = create_access_token({"sub": "1"})
        tampered = token[:-5] + " XXXXX"
        with pytest.raises(HTTPException):
            decode_token(tampered)


# ─── Unit: Auth Service ───────────────────────────────────────────────────────

class TestAuthService:

    def test_register_new_user(self, db):
        svc = AuthService()
        data = UserRegister(name="John Doe", email="john@test.com", password="Secure@123")
        user = svc.register(db, data)
        assert user.id is not None
        assert user.email == "john@test.com"
        assert user.hashed_password != "Secure@123"

    def test_register_duplicate_email_raises(self, db):
        from fastapi import HTTPException
        svc = AuthService()
        data = UserRegister(name="John", email="dup@test.com", password="Secure@123")
        svc.register(db, data)
        with pytest.raises(HTTPException) as exc:
            svc.register(db, data)
        assert exc.value.status_code == 409

    def test_login_valid_credentials(self, db, test_user):
        svc = AuthService()
        data = UserLogin(email="test@trec.com", password="Test@1234")
        result = svc.login(db, data)
        assert result.access_token
        assert result.refresh_token
        assert result.token_type == "bearer"

    def test_login_wrong_password_raises(self, db, test_user):
        from fastapi import HTTPException
        svc = AuthService()
        data = UserLogin(email="test@trec.com", password="WrongPass@1")
        with pytest.raises(HTTPException) as exc:
            svc.login(db, data)
        assert exc.value.status_code == 401

    def test_login_increments_failed_attempts(self, db, test_user):
        from fastapi import HTTPException
        svc = AuthService()
        data = UserLogin(email="test@trec.com", password="Wrong@123")
        for _ in range(3):
            try:
                svc.login(db, data)
            except HTTPException:
                pass
        db.refresh(test_user)
        assert test_user.failed_login_attempts == 3

    def test_login_nonexistent_email_raises(self, db):
        from fastapi import HTTPException
        svc = AuthService()
        data = UserLogin(email="ghost@test.com", password="Test@1234")
        with pytest.raises(HTTPException) as exc:
            svc.login(db, data)
        assert exc.value.status_code == 401

    def test_get_user_by_id_found(self, db, test_user):
        svc = AuthService()
        user = svc.get_user_by_id(db, test_user.id)
        assert user.id == test_user.id

    def test_get_user_by_id_not_found(self, db):
        from fastapi import HTTPException
        svc = AuthService()
        with pytest.raises(HTTPException) as exc:
            svc.get_user_by_id(db, 9999)
        assert exc.value.status_code == 404


# ─── Integration: Auth API ────────────────────────────────────────────────────

class TestAuthAPI:

    def test_register_endpoint(self, client):
        response = client.post("/api/v1/auth/register", json={
            "name": "Alice",
            "email": "alice@trec.com",
            "password": "Alice@1234",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "alice@trec.com"
        assert "hashed_password" not in data

    def test_register_weak_password_rejected(self, client):
        response = client.post("/api/v1/auth/register", json={
            "name": "Bob",
            "email": "bob@trec.com",
            "password": "weak",
        })
        assert response.status_code == 422

    def test_login_endpoint(self, client, test_user):
        response = client.post("/api/v1/auth/login", json={
            "email": "test@trec.com",
            "password": "Test@1234",
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_get_me_requires_auth(self, client):
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 403

    def test_get_me_with_auth(self, client, auth_headers):
        response = client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["email"] == "test@trec.com"

    def test_refresh_token(self, client, test_user):
        login = client.post("/api/v1/auth/login", json={
            "email": "test@trec.com",
            "password": "Test@1234",
        })
        refresh_token = login.json()["refresh_token"]

        response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert response.status_code == 200
        assert "access_token" in response.json()
