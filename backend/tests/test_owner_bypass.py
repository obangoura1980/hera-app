# Owner bypass (PREMIUM_BYPASS_EMAILS) and fresh-account subscription status tests.
# Flow: trigger OTP send -> override code_hash in mongo -> verify -> GET /api/subscription
import hashlib
import os
import subprocess
import uuid

import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
JWT_SECRET = None
# read JWT_SECRET from backend/.env
with open("/app/backend/.env") as f:
    for line in f:
        if line.startswith("JWT_SECRET="):
            JWT_SECRET = line.strip().split("=", 1)[1]
assert JWT_SECRET, "JWT_SECRET missing from backend/.env"

OWNER_EMAIL = "iaminamrana@gmail.com"
FRESH_EMAIL = f"test_rc_{uuid.uuid4().hex[:8]}@resend.dev"


def _mongo(cmd: str):
    subprocess.run(
        ["mongosh", "--quiet", "test_database", "--eval", cmd],
        check=True, capture_output=True, text=True,
    )


def _get_token(email: str) -> str:
    # clear rate-limit log, send OTP, override hash, verify
    _mongo('db.otp_log.deleteMany({})')
    r = requests.post(f"{BASE_URL}/api/auth/otp/send", json={"email": email}, timeout=30)
    assert r.status_code == 200, f"otp send failed: {r.status_code} {r.text[:300]}"
    code_hash = hashlib.sha256(f"{email}:1234:{JWT_SECRET}".encode()).hexdigest()
    _mongo('db.otps.updateOne({"email": "%s"}, {"$set": {"code_hash": "%s", "attempts": 0}})' % (email, code_hash))
    r = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={"email": email, "code": "1234"}, timeout=30)
    assert r.status_code == 200, f"otp verify failed: {r.status_code} {r.text[:300]}"
    data = r.json()
    assert "access_token" in data
    return data["access_token"]


class TestSubscriptionBypass:
    def test_owner_email_is_subscribed_without_purchase(self):
        """Owner allowlist: iaminamrana@gmail.com -> subscribed:true"""
        token = _get_token(OWNER_EMAIL)
        r = requests.get(f"{BASE_URL}/api/subscription",
                         headers={"Authorization": f"Bearer {token}"}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data.get("subscribed") is True, f"owner not subscribed: {data}"

    def test_fresh_account_not_subscribed(self):
        """Fresh account: subscribed:false"""
        token = _get_token(FRESH_EMAIL)
        r = requests.get(f"{BASE_URL}/api/subscription",
                         headers={"Authorization": f"Bearer {token}"}, timeout=30)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data.get("subscribed") is False, f"fresh account unexpectedly subscribed: {data}"

    def test_subscription_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/subscription", timeout=30)
        assert r.status_code in (401, 403), f"unauth access allowed: {r.status_code}"
