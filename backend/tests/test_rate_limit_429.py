# Iteration 15 / Bug 3: provider 429 must surface as HTTP 429 'Too many attempts...'
# (previously a generic 502 on the 'Create an Account' screen).
# Covers: send_email status mapping (429->429, 422 undeliverable->400, other->502),
# otp/send propagates the 429 HTTPException, and live otp/send returns 200 ok
# for a valid email (or, if the provider is rate-limiting right now, HTTP 429
# with the friendly message -- proving the mapping end-to-end).
import asyncio
import os
import sys

import pytest
import requests
from fastapi import HTTPException
from pymongo import MongoClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import server  # noqa: E402  (backend module under test)

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

mongo = MongoClient(MONGO_URL)
db = mongo[DB_NAME]


class _FakeResp:
    """Stand-in for httpx.Response that raises HTTPStatusError like the real one."""
    def __init__(self, status_code: int, text: str):
        self.status_code = status_code
        self.text = text

    def raise_for_status(self):
        raise server.httpx.HTTPStatusError("provider error", request=None, response=self)

    def json(self):
        return {}


class _FakeClient:
    """Async context manager standing in for httpx.AsyncClient."""
    resp = _FakeResp(200, "")

    def __init__(self, *a, **k):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def post(self, *a, **k):
        return type(self).resp


def _run_send(resp: _FakeResp):
    original = server.httpx.AsyncClient
    _FakeClient.resp = resp
    server.httpx.AsyncClient = _FakeClient
    try:
        return asyncio.run(server.send_email(
            to="delivered@resend.dev",
            subject="Your Hera sign-in code: 1234",
            html=server._otp_html("1234"),
        ))
    finally:
        server.httpx.AsyncClient = original


# ---------------- send_email status mapping (unit) ----------------

class TestSendEmailStatusMapping:
    def test_provider_429_maps_to_http_429_with_friendly_message(self):
        with pytest.raises(HTTPException) as ei:
            _run_send(_FakeResp(429, "email rate limit exceeded"))
        assert ei.value.status_code == 429
        assert "Too many attempts" in ei.value.detail
        assert ei.value.status_code != 502

    def test_provider_422_undeliverable_maps_to_400(self):
        with pytest.raises(HTTPException) as ei:
            _run_send(_FakeResp(422, '{"error":"undeliverable_recipient"}'))
        assert ei.value.status_code == 400
        assert "valid email" in ei.value.detail.lower()

    def test_provider_other_error_still_maps_to_502(self):
        with pytest.raises(HTTPException) as ei:
            _run_send(_FakeResp(500, "internal"))
        assert ei.value.status_code == 502

    def test_provider_success_returns_id(self):
        class _Ok(_FakeResp):
            def raise_for_status(self):
                return None

            def json(self):
                return {"id": "msg_123"}
        assert _run_send(_Ok(200, "")) == "msg_123"


# ---------------- otp/send propagates the 429 (unit) ----------------

class TestOtpSendPropagates429:
    def test_otp_send_raises_429_and_cleans_up_otp_record(self):
        email = "TEST_429propagate@hera.app"
        db.otps.delete_many({"email": email})
        db.otp_log.delete_many({"email": email})
        original_client = server.httpx.AsyncClient
        _FakeClient.resp = _FakeResp(429, "email rate limit exceeded")
        server.httpx.AsyncClient = _FakeClient
        try:
            with pytest.raises(HTTPException) as ei:
                asyncio.run(server.otp_send(server.OtpSendIn(email=email)))
            assert ei.value.status_code == 429
            assert "Too many attempts" in ei.value.detail
        finally:
            server.httpx.AsyncClient = original_client
        # Failure cleanup: no orphan OTP left behind
        assert db.otps.find_one({"email": email}) is None
        db.otps.delete_many({"email": email})
        db.otp_log.delete_many({"email": email})


# ---------------- Live API: valid email still returns ok ----------------

class TestOtpSendLive:
    def test_send_valid_email_ok_or_friendly_429(self):
        email = "delivered@resend.dev"
        db.otps.delete_many({"email": email})
        db.otp_log.delete_many({"email": email})
        r = requests.post(f"{API}/auth/otp/send", json={"email": email}, timeout=30)
        assert r.status_code in (200, 429), f"unexpected {r.status_code}: {r.text}"
        if r.status_code == 429:
            # Live proof of the fix: client gets friendly 429, NOT a generic 502
            assert "Too many attempts" in r.json().get("detail", "")
        else:
            assert r.json().get("ok") is True
            rec = db.otps.find_one({"email": email})
            assert rec is not None and len(rec["code_hash"]) == 64
        db.otps.delete_many({"email": email})
        db.otp_log.delete_many({"email": email})
