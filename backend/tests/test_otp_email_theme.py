# Iteration 14: OTP email theme rewrite (_otp_html) + send-failure OTP cleanup.
# Covers: scanner safety of new dark HERA template, real send to delivered@resend.dev,
# 30s resend-reuse behavior, end-to-end verify via mongo code_hash override,
# and OTP record deletion when send_email throws.
import asyncio
import datetime
import hashlib
import os
import sys
import uuid

import pytest
import requests
from pymongo import MongoClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import server  # noqa: E402  (backend module under test)

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
JWT_SECRET = os.environ.get(
    "JWT_SECRET",
    "9f3c2a7e5b1d4c8fa06e2b7d93c1f54ea8b2d7c6e1f0a9b3c5d7e2f4a6b8c0d1",
)
TEST_EMAIL = "delivered@resend.dev"

mongo = MongoClient(MONGO_URL)
db = mongo[DB_NAME]


def _hash_code(email: str, code: str) -> str:
    return hashlib.sha256(f"{email}:{code}:{JWT_SECRET}".encode()).hexdigest()


def _reset_otp_state(email: str):
    """Clear OTP record + rate-limit log so send tests are deterministic."""
    email = email.strip().lower()
    db.otps.delete_many({"email": email})
    db.otp_log.delete_many({"email": email})


# ---------------- _otp_html unit tests (scanner safety + theme) ----------------

class TestOtpHtmlTemplate:
    """Code-level review assertions for the rewritten _otp_html."""

    def test_passes_assert_safe_email_scanner(self):
        html = server._otp_html("1234")
        subject = f"Your {server.EMAIL_FROM_NAME} sign-in code: 1234"
        # Must not raise
        server._assert_safe_email(subject, html)

    def test_no_links_forms_or_inputs(self):
        html = server._otp_html("1234").lower()
        for bad in ("<a ", "<a>", "<form", "<input", "<textarea", "<select",
                    "http://", "https://", "href=", "src="):
            assert bad not in html, f"unsafe fragment present: {bad}"

    def test_dark_hera_theme_markers(self):
        html = server._otp_html("1234")
        for marker in ("#080A18", "#0F1028", "#262A4D", "#F4D35E", "#A855F7",
                       "#6E6394", "Georgia", "HERA", "AI MANIFESTATION COMPANION",
                       "Beautiful soul, your journey continues.",
                       "border-radius:20px", "letter-spacing:14px"):
            assert marker in html, f"missing theme marker: {marker}"

    def test_code_rendered_escaped_in_chip(self):
        html = server._otp_html("9876")
        assert ">9876</td>" in html
        assert "font-size:34px" in html and "letter-spacing:12px" in html

    def test_from_name_is_escaped(self):
        original = server.EMAIL_FROM_NAME
        try:
            server.EMAIL_FROM_NAME = 'Hera <script>alert(1)</script> & "Co"'
            html = server._otp_html("1234")
            assert "<script>" not in html
            assert "&lt;script&gt;" in html
        finally:
            server.EMAIL_FROM_NAME = original

    def test_scanner_still_rejects_unsafe_html(self):
        # Negative control: scanner must still trip on a form tag
        with pytest.raises(ValueError):
            server._assert_safe_email("s", '<form action="https://x"></form>')
        with pytest.raises(ValueError):
            server._assert_safe_email("s", '<a href="http://evil.com">x</a>')


# ---------------- Live API: send / resend-reuse / verify ----------------

@pytest.fixture(scope="module")
def sent_otp():
    """Send one real OTP email (module-shared to minimize provider calls).
    Skips if the external email provider is rate-limiting us."""
    _reset_otp_state(TEST_EMAIL)
    r = requests.post(f"{API}/auth/otp/send", json={"email": TEST_EMAIL}, timeout=30)
    if r.status_code == 502:
        pytest.skip("email provider unavailable/rate-limited (502 from send_email)")
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True
    return TEST_EMAIL


class TestOtpSendLive:
    def test_send_real_email_ok(self, sent_otp):
        # OTP record persisted with a hashed (not plaintext) code
        rec = db.otps.find_one({"email": sent_otp})
        assert rec is not None
        assert len(rec["code_hash"]) == 64

    def test_resend_within_30s_reuses_code(self, sent_otp):
        hash_after_first = db.otps.find_one({"email": sent_otp})["code_hash"]
        log_count_after_first = db.otp_log.count_documents({"email": sent_otp})

        r2 = requests.post(f"{API}/auth/otp/send", json={"email": sent_otp}, timeout=30)
        assert r2.status_code == 200, r2.text
        assert r2.json().get("ok") is True
        # Same code reused, no new send logged
        assert db.otps.find_one({"email": sent_otp})["code_hash"] == hash_after_first
        assert db.otp_log.count_documents({"email": sent_otp}) == log_count_after_first

    def test_verify_end_to_end_with_code_override(self, sent_otp):
        known = "4321"
        db.otps.update_one({"email": sent_otp},
                           {"$set": {"code_hash": _hash_code(sent_otp, known), "attempts": 0}})
        r = requests.post(f"{API}/auth/otp/verify",
                          json={"email": sent_otp, "code": known}, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["access_token"]
        assert body["token_type"] == "bearer"
        assert body["user"]["email"] == sent_otp
        # OTP consumed on success
        assert db.otps.find_one({"email": sent_otp}) is None


# ---------------- Send-failure cleanup (new behavior) ----------------

class TestSendFailureCleanup:
    def test_otp_record_deleted_when_send_email_throws(self):
        email = f"TEST_sendfail_{uuid.uuid4().hex[:8]}@hera.app"
        _reset_otp_state(email)
        original = server.send_email

        async def _boom(**kwargs):
            raise RuntimeError("simulated provider outage")

        server.send_email = _boom
        try:
            with pytest.raises(Exception):
                asyncio.run(server.otp_send(server.OtpSendIn(email=email)))
        finally:
            server.send_email = original
        # The user must NOT be left with a code they never received
        assert db.otps.find_one({"email": email}) is None
        _reset_otp_state(email)
