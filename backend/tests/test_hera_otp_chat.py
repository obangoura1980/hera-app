# Tests for Hera repo port: email OTP, /hera-chat (Claude stream+non-stream),
# /subscription, DELETE /account.
import os
import time
import uuid
import hashlib
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
JWT_SECRET = os.environ.get(
    "JWT_SECRET",
    "9f3c2a7e5b1d4c8fa06e2b7d93c1f54ea8b2d7c6e1f0a9b3c5d7e2f4a6b8c0d1",
)

mongo = MongoClient(MONGO_URL)
db = mongo[DB_NAME]


def _hash_code(email: str, code: str) -> str:
    return hashlib.sha256(f"{email}:{code}:{JWT_SECRET}".encode()).hexdigest()


def _set_otp(email: str, code: str = "123456"):
    """Overwrite the DB OTP record so verify can succeed deterministically.
    Server lowercases/strips the email, so store the normalized form."""
    import datetime
    email = email.strip().lower()
    now = datetime.datetime.now(datetime.timezone.utc)
    db.otps.delete_many({"email": email})
    db.otps.insert_one({
        "email": email,
        "code_hash": _hash_code(email, code),
        "attempts": 0,
        "created_at": now,
        "expires_at": now + datetime.timedelta(minutes=10),
    })


# ---------------- OTP flow ----------------

class TestOtpSend:
    def test_send_404_when_should_not_create(self):
        email = f"TEST_ghost_{uuid.uuid4().hex[:8]}@hera.app"
        r = requests.post(f"{API}/auth/otp/send",
                          json={"email": email, "should_create_user": False})
        assert r.status_code == 404, r.text

    def test_send_rate_limited_within_30s(self):
        email = f"TEST_otp_{uuid.uuid4().hex[:8]}@hera.app"
        r1 = requests.post(f"{API}/auth/otp/send",
                           json={"email": email, "should_create_user": True})
        assert r1.status_code == 200, r1.text
        r2 = requests.post(f"{API}/auth/otp/send",
                           json={"email": email, "should_create_user": True})
        assert r2.status_code == 429, r2.text


class TestOtpVerify:
    def test_invalid_code(self):
        email = f"TEST_otpbad_{uuid.uuid4().hex[:8]}@hera.app"
        _set_otp(email, "222333")
        r = requests.post(f"{API}/auth/otp/verify",
                          json={"email": email, "code": "000000"})
        assert r.status_code == 400
        assert "Invalid code" in r.text

    def test_attempts_limit(self):
        email = f"TEST_otpmax_{uuid.uuid4().hex[:8]}@hera.app"
        _set_otp(email, "222333")
        for _ in range(5):
            requests.post(f"{API}/auth/otp/verify",
                          json={"email": email, "code": "000000"})
        r = requests.post(f"{API}/auth/otp/verify",
                         json={"email": email, "code": "222333"})
        assert r.status_code == 429, r.text

    def test_valid_code_new_user_autoregisters(self):
        email = f"TEST_otpnew_{uuid.uuid4().hex[:8]}@hera.app"
        _set_otp(email, "654321")
        r = requests.post(f"{API}/auth/otp/verify",
                          json={"email": email, "code": "654321"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["token_type"] == "bearer"
        assert body["access_token"]
        assert body["user"]["email"] == email.lower()
        # cleanup
        db.users.delete_one({"email": email.lower()})


# ---------------- Shared user fixture for auth-required endpoints ----------------

@pytest.fixture(scope="module")
def auth():
    email = f"TEST_portuser_{uuid.uuid4().hex[:8]}@hera.app"
    _set_otp(email, "111222")
    r = requests.post(f"{API}/auth/otp/verify",
                      json={"email": email, "code": "111222"})
    assert r.status_code == 200, r.text
    body = r.json()
    token = body["access_token"]
    uid = body["user"]["id"]
    yield {"token": token, "email": email, "id": uid,
           "headers": {"Authorization": f"Bearer {token}"}}
    # Teardown
    try:
        db.users.delete_one({"email": email})
    except Exception:
        pass


# ---------------- /subscription ----------------

class TestSubscription:
    def test_requires_auth(self):
        r = requests.get(f"{API}/subscription")
        assert r.status_code == 401

    def test_default_free(self, auth):
        r = requests.get(f"{API}/subscription", headers=auth["headers"])
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["subscribed"] is False
        assert data["plan"] == "free"
        assert data["is_trial"] is False

    def test_after_premium_activate(self, auth):
        requests.post(f"{API}/premium/activate", headers=auth["headers"])
        r = requests.get(f"{API}/subscription", headers=auth["headers"])
        data = r.json()
        assert data["subscribed"] is True
        assert data["plan"] == "yearly"


# ---------------- /hera-chat ----------------

class TestHeraChat:
    def test_non_stream(self, auth):
        payload = {
            "messages": [{"role": "user", "content": "Say the word pineapple back to me."}],
            "userName": "Tester",
            "goals": ["peace"],
            "focusAreas": ["gratitude"],
            "stream": False,
        }
        r = requests.post(f"{API}/hera-chat", json=payload,
                          headers=auth["headers"], timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data.get("content"), str)
        assert len(data["content"].strip()) > 0

    def test_stream_openai_style(self, auth):
        payload = {
            "messages": [{"role": "user", "content": "Give me one short grounding affirmation."}],
            "userName": "Tester",
            "stream": True,
        }
        with requests.post(f"{API}/hera-chat", json=payload,
                           headers=auth["headers"], stream=True, timeout=60) as r:
            assert r.status_code == 200
            saw_delta, saw_done = False, False
            text = ""
            for raw in r.iter_lines(decode_unicode=True):
                if not raw or not raw.startswith("data:"):
                    continue
                body = raw[5:].strip()
                if body == "[DONE]":
                    saw_done = True
                    break
                import json as _j
                evt = _j.loads(body)
                piece = evt.get("choices", [{}])[0].get("delta", {}).get("content", "")
                if piece:
                    saw_delta = True
                    text += piece
            assert saw_delta, "no delta events"
            assert saw_done, "no [DONE] terminator"
            assert len(text.strip()) > 5

    def test_empty_messages_rejected(self, auth):
        r = requests.post(f"{API}/hera-chat",
                          json={"messages": [], "stream": False},
                          headers=auth["headers"])
        assert r.status_code == 400

    def test_works_without_auth(self):
        # /hera-chat accepts anonymous (creds optional per server.py)
        r = requests.post(f"{API}/hera-chat",
                          json={"messages": [{"role": "user", "content": "hi"}],
                                "stream": False},
                          timeout=60)
        assert r.status_code == 200


# ---------------- DELETE /account ----------------

class TestDeleteAccount:
    def test_delete_account(self):
        email = f"TEST_delacc_{uuid.uuid4().hex[:8]}@hera.app"
        _set_otp(email, "909090")
        r = requests.post(f"{API}/auth/otp/verify",
                          json={"email": email, "code": "909090"})
        assert r.status_code == 200
        tok = r.json()["access_token"]
        h = {"Authorization": f"Bearer {tok}"}

        d = requests.delete(f"{API}/account", headers=h)
        assert d.status_code == 200
        assert d.json().get("ok") is True

        # subsequent /auth/me must fail (user deleted)
        me = requests.get(f"{API}/auth/me", headers=h)
        assert me.status_code == 401
