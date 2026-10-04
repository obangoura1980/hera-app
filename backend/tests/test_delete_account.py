# Delete-account E2E (backend) — bug regression: DELETE /api/account must replace
# the old Supabase edge-function flow (404). Covers:
#  - health, delete-account auth guard
#  - full throwaway-account lifecycle: OTP register -> me -> reset journey ->
#    deletion OTP (should_create_user=false) -> wrong code (400, NOT deleted) ->
#    correct code -> DELETE /account -> 200 -> token 401 -> fresh re-register
#  - regression: delivered@resend.dev password login still works + premium intact
import datetime
import hashlib
import os

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

THROWAWAY = "delete-me@resend.dev"   # destructive test account (NOT delivered@resend.dev)
PREMIUM_EMAIL = "delivered@resend.dev"
PREMIUM_PASSWORD = "hera1234"

mongo = MongoClient(MONGO_URL)
db = mongo[DB_NAME]


def _hash_code(email: str, code: str) -> str:
    return hashlib.sha256(f"{email}:{code}:{JWT_SECRET}".encode()).hexdigest()


def _set_otp(email: str, code: str):
    """Overwrite the stored OTP so verify succeeds deterministically (4-digit)."""
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


def _purge_user(email: str):
    """Hard cleanup of a throwaway account and its OTP records."""
    email = email.strip().lower()
    doc = db.users.find_one({"email": email})
    if doc:
        uid = str(doc["_id"])
        for coll in ("journal", "goals", "coach_messages", "favorites", "activities"):
            db[coll].delete_many({"user_id": uid})
        db.users.delete_one({"_id": doc["_id"]})
    db.otps.delete_many({"email": email})


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------- health/guards
class TestBasics:
    def test_api_health(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("message") == "Hera API"

    def test_delete_account_requires_auth(self):
        r = requests.delete(f"{API}/account")
        assert r.status_code in (401, 403), r.text

    def test_delete_account_bad_token(self):
        r = requests.delete(f"{API}/account", headers=_auth("not.a.token"))
        assert r.status_code == 401, r.text


# ------------------------------------------------------- regression: premium user
class TestPremiumRegression:
    def test_delivered_login_and_premium_intact(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": PREMIUM_EMAIL, "password": PREMIUM_PASSWORD})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["access_token"]
        assert data["user"]["email"] == PREMIUM_EMAIL
        assert data["user"]["is_premium"] is True, "premium flag lost!"
        # token works
        me = requests.get(f"{API}/auth/me", headers=_auth(data["access_token"]))
        assert me.status_code == 200, me.text
        assert me.json()["email"] == PREMIUM_EMAIL


# ------------------------------------------------------ full delete-account flow
class TestDeleteAccountFlow:
    @pytest.fixture(scope="class")
    def ctx(self):
        _purge_user(THROWAWAY)
        yield {}
        _purge_user(THROWAWAY)

    def test_full_lifecycle(self, ctx):
        # 1) register throwaway via OTP (auto-register on verify)
        r = requests.post(f"{API}/auth/otp/send",
                          json={"email": THROWAWAY, "should_create_user": True})
        assert r.status_code == 200, r.text
        _set_otp(THROWAWAY, "4321")
        r = requests.post(f"{API}/auth/otp/verify",
                          json={"email": THROWAWAY, "code": "4321"})
        assert r.status_code == 200, r.text
        token1 = r.json()["access_token"]
        uid1 = r.json()["user"]["id"]
        assert r.json()["user"]["email"] == THROWAWAY

        # 2) token works
        me = requests.get(f"{API}/auth/me", headers=_auth(token1))
        assert me.status_code == 200 and me.json()["id"] == uid1

        # 3) regression: reset journey endpoint works for this account
        rr = requests.post(f"{API}/account/reset", headers=_auth(token1))
        assert rr.status_code == 200 and rr.json().get("ok") is True, rr.text
        assert requests.get(f"{API}/auth/me", headers=_auth(token1)).status_code == 200

        # 4) deletion OTP send (should_create_user=false — account exists)
        r = requests.post(f"{API}/auth/otp/send",
                          json={"email": THROWAWAY, "should_create_user": False})
        assert r.status_code == 200, r.text

        # 5) NEGATIVE: wrong code -> 400 Invalid code, account NOT deleted
        _set_otp(THROWAWAY, "9876")
        bad = requests.post(f"{API}/auth/otp/verify",
                            json={"email": THROWAWAY, "code": "0000"})
        assert bad.status_code == 400, bad.text
        assert "Invalid code" in bad.text
        assert db.users.find_one({"email": THROWAWAY}) is not None
        assert requests.get(f"{API}/auth/me", headers=_auth(token1)).status_code == 200

        # 6) correct deletion code -> fresh session token (shim verifyOtp behavior)
        _set_otp(THROWAWAY, "9876")  # resets attempts too
        ok = requests.post(f"{API}/auth/otp/verify",
                           json={"email": THROWAWAY, "code": "9876"})
        assert ok.status_code == 200, ok.text
        token2 = ok.json()["access_token"]
        assert ok.json()["user"]["id"] == uid1

        # 7) DELETE /api/account — the fixed flow (was Supabase edge function 404)
        d = requests.delete(f"{API}/account", headers=_auth(token2))
        assert d.status_code == 200, d.text
        assert d.json().get("ok") is True

        # 8) post-delete: user doc gone, both tokens rejected
        assert db.users.find_one({"email": THROWAWAY}) is None
        assert requests.get(f"{API}/auth/me", headers=_auth(token2)).status_code == 401
        assert requests.get(f"{API}/auth/me", headers=_auth(token1)).status_code == 401
        # second delete is unauthorized, not 500
        assert requests.delete(f"{API}/account", headers=_auth(token2)).status_code == 401

        # 9) password login for deleted email fails (random unknown pw / no user)
        lg = requests.post(f"{API}/auth/login",
                           json={"email": THROWAWAY, "password": "whatever1"})
        assert lg.status_code == 401

        # 10) same email can re-register as a FRESH account
        r = requests.post(f"{API}/auth/otp/send",
                          json={"email": THROWAWAY, "should_create_user": True})
        assert r.status_code == 200, r.text
        _set_otp(THROWAWAY, "4321")
        r = requests.post(f"{API}/auth/otp/verify",
                          json={"email": THROWAWAY, "code": "4321"})
        assert r.status_code == 200, r.text
        token3 = r.json()["access_token"]
        uid3 = r.json()["user"]["id"]
        assert uid3 != uid1, "re-registered account should be a fresh user doc"
        assert r.json()["user"]["is_premium"] is False

        # cleanup: delete the fresh account too
        d2 = requests.delete(f"{API}/account", headers=_auth(token3))
        assert d2.status_code == 200, d2.text
        assert db.users.find_one({"email": THROWAWAY}) is None
