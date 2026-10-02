"""Subscription / premium activation flow tests (iteration 12).

Covers the bug fix areas:
- POST /api/premium/activate (demo checkout) requires auth and confirms is_premium
- GET /api/subscription reflects premium state (server fallback used by SubscriptionContext)
- OTP auth flow for existing premium user (delivered@resend.dev)
- Fresh OTP-registered user is non-premium until activation; activation persists
"""
import hashlib
import os
import time
import uuid

import pytest
import requests
from dotenv import dotenv_values
from pymongo import MongoClient

# ---------------------------------------------------------------- config
_frontend_env = dotenv_values("/app/frontend/.env")
_backend_env = dotenv_values("/app/backend/.env")
BASE_URL = _frontend_env["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
MONGO_URL = _backend_env["MONGO_URL"]
DB_NAME = _backend_env["DB_NAME"]
JWT_SECRET = _backend_env["JWT_SECRET"]

PREMIUM_EMAIL = "delivered@resend.dev"  # is_premium=true per test_credentials.md


def _otp_override(email: str, code: str = "4242") -> None:
    """Overwrite stored OTP with a known code (per /app/memory/test_credentials.md)."""
    code_hash = hashlib.sha256(f"{email}:{code}:{JWT_SECRET}".encode()).hexdigest()
    client = MongoClient(MONGO_URL)
    try:
        res = client[DB_NAME].otps.update_one(
            {"email": email}, {"$set": {"code_hash": code_hash, "attempts": 0}}
        )
        assert res.matched_count == 1, "OTP record not found to override"
    finally:
        client.close()


def _otp_record_exists(email: str) -> bool:
    client = MongoClient(MONGO_URL)
    try:
        return client[DB_NAME].otps.find_one({"email": email}) is not None
    finally:
        client.close()


def _login_via_otp(api_client: requests.Session, email: str, code: str = "4242") -> str:
    r = api_client.post(f"{BASE_URL}/api/auth/otp/send", json={"email": email})
    if r.status_code == 502:
        # Upstream Emergent email relay rate-limits (429) under test load; the OTP
        # record is inserted in mongo BEFORE the email send, so the login can still
        # proceed via the code override. Fail only if no OTP record exists.
        assert _otp_record_exists(email), (
            f"otp/send returned 502 AND no OTP record persisted for {email}: {r.text}"
        )
        print(f"WARN: otp/send 502 (email relay rate-limited) for {email}; continuing via mongo override")
    else:
        assert r.status_code == 200, f"otp/send failed: {r.status_code} {r.text}"
    time.sleep(0.5)  # let the OTP doc be written
    _otp_override(email, code)
    r = api_client.post(f"{BASE_URL}/api/auth/otp/verify", json={"email": email, "code": code})
    assert r.status_code == 200, f"otp/verify failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    assert "user" in data
    return data["access_token"]


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def premium_token():
    """Single OTP login for delivered@resend.dev, shared across tests (OTP send is
    rate-limited to 5 per 10 minutes, so we must not log in per-test)."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return _login_via_otp(s, PREMIUM_EMAIL)


# ---------------------------------------------------------------- premium user flow
class TestPremiumUser:
    def test_otp_login_premium_user(self, premium_token):
        assert premium_token

    def test_subscription_status_premium(self, api_client, premium_token):
        r = api_client.get(
            f"{BASE_URL}/api/subscription", headers={"Authorization": f"Bearer {premium_token}"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["subscribed"] is True, f"expected subscribed=true, got {data}"
        assert data["plan"] in ("yearly", "monthly", "annual")

    def test_auth_me_is_premium(self, api_client, premium_token):
        r = api_client.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {premium_token}"})
        assert r.status_code == 200
        assert r.json()["is_premium"] is True


# ---------------------------------------------------------------- demo activation
class TestPremiumActivate:
    def test_activate_requires_auth(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/premium/activate")
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"

    def test_subscription_requires_auth(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/subscription")
        assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"

    def test_fresh_user_nonpremium_then_activate(self, api_client):
        """Fresh OTP-registered user starts non-premium; activation sets + persists is_premium."""
        email = f"test_iter12_{uuid.uuid4().hex[:8]}@resend.dev"
        token = _login_via_otp(api_client, email)

        # 1. New user must be non-premium
        r = api_client.get(
            f"{BASE_URL}/api/subscription", headers={"Authorization": f"Bearer {token}"}
        )
        assert r.status_code == 200
        data = r.json()
        assert data["subscribed"] is False, f"fresh user should be non-premium, got {data}"
        assert data["plan"] == "free"

        # 2. Demo checkout activation confirms is_premium in the RESPONSE (frontend gates
        #    navigation on this flag)
        r = api_client.post(
            f"{BASE_URL}/api/premium/activate", headers={"Authorization": f"Bearer {token}"}
        )
        assert r.status_code == 200, f"activate failed: {r.status_code} {r.text}"
        body = r.json()
        assert body.get("is_premium") is True, f"response must confirm is_premium, got {body}"

        # 3. Persistence check via GET /api/subscription
        r = api_client.get(
            f"{BASE_URL}/api/subscription", headers={"Authorization": f"Bearer {token}"}
        )
        assert r.status_code == 200
        assert r.json()["subscribed"] is True

        # 4. Persistence check via GET /api/auth/me
        r = api_client.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.json()["is_premium"] is True

        # cleanup: remove test user
        client = MongoClient(MONGO_URL)
        try:
            client[DB_NAME].users.delete_one({"email": email})
        finally:
            client.close()

    def test_activate_idempotent(self, api_client, premium_token):
        """Re-activating an already premium user still returns 200 with is_premium."""
        r = api_client.post(
            f"{BASE_URL}/api/premium/activate", headers={"Authorization": f"Bearer {premium_token}"}
        )
        assert r.status_code == 200
        assert r.json().get("is_premium") is True
