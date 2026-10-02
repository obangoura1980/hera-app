"""
Tests for Hera profile/upload/reset flow (iteration 5):
  POST /api/upload (multipart image, bearer) returns {path}
  PATCH /api/auth/me {avatar_path: path} sets it on the profile
  GET /api/auth/me returns avatar_path
  GET /api/files/{path}?token=... returns the image bytes
  PATCH /api/auth/me {avatar_path: ''} clears it to null
  PATCH /api/auth/me {avatar_path: 'nonsense'} returns 400 'Unknown image'
  POST /api/account/reset returns {ok: True}
"""
import io
import os
import uuid
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


# A minimal 1x1 PNG (89-byte).
PNG_1x1 = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
    "890000000d49444154789c6300010000000500010d0a2db40000000049454e44"
    "ae426082"
)


@pytest.fixture(scope="module")
def auth():
    """Register a throwaway TEST_ user and return (token, user_id)."""
    s = requests.Session()
    email = f"TEST_prof_{uuid.uuid4().hex[:10]}@example.com"
    r = s.post(f"{BASE_URL}/api/auth/register",
               json={"name": "Prof Tester", "email": email, "password": "secret12"})
    assert r.status_code == 201, r.text
    data = r.json()
    tok = data["access_token"]
    uid = data["user"]["id"]
    s.headers.update({"Authorization": f"Bearer {tok}"})
    yield s, tok, uid, email


# ------- UPLOAD ---------------------------------------------------------------
class TestUpload:
    def test_upload_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/upload",
                          files={"file": ("a.png", PNG_1x1, "image/png")})
        assert r.status_code == 401

    def test_upload_rejects_non_image(self, auth):
        s, *_ = auth
        r = s.post(f"{BASE_URL}/api/upload",
                   files={"file": ("note.txt", b"hello", "text/plain")})
        assert r.status_code == 400
        assert "image" in r.json()["detail"].lower()

    def test_upload_png_returns_path(self, auth):
        s, *_ = auth
        r = s.post(f"{BASE_URL}/api/upload",
                   files={"file": ("avatar.png", PNG_1x1, "image/png")})
        if r.status_code == 402:
            pytest.skip("Storage credits exhausted on this environment")
        assert r.status_code == 200, r.text
        body = r.json()
        assert "path" in body and body["path"]
        assert body["path"].endswith(".png")


# ------- AVATAR PATCH + GET /files -------------------------------------------
class TestAvatarPatchAndFile:
    def _upload(self, s):
        r = s.post(f"{BASE_URL}/api/upload",
                   files={"file": ("avatar.png", PNG_1x1, "image/png")})
        if r.status_code == 402:
            pytest.skip("Storage credits exhausted on this environment")
        assert r.status_code == 200, r.text
        return r.json()["path"]

    def test_patch_set_then_get_me_then_clear(self, auth):
        s, tok, *_ = auth
        path = self._upload(s)

        # Set
        r = s.patch(f"{BASE_URL}/api/auth/me", json={"avatar_path": path})
        assert r.status_code == 200, r.text
        assert r.json()["avatar_path"] == path

        # GET /auth/me reflects it
        me = s.get(f"{BASE_URL}/api/auth/me").json()
        assert me["avatar_path"] == path

        # GET /files/{path}?token=... returns bytes
        r = requests.get(f"{BASE_URL}/api/files/{path}", params={"token": tok})
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("image/")
        assert len(r.content) > 0

        # GET /files without token -> 401
        r = requests.get(f"{BASE_URL}/api/files/{path}")
        assert r.status_code == 401

        # Clear
        r = s.patch(f"{BASE_URL}/api/auth/me", json={"avatar_path": ""})
        assert r.status_code == 200, r.text
        assert r.json()["avatar_path"] is None
        me = s.get(f"{BASE_URL}/api/auth/me").json()
        assert me["avatar_path"] is None

    def test_patch_unknown_avatar_returns_400(self, auth):
        s, *_ = auth
        r = s.patch(f"{BASE_URL}/api/auth/me",
                    json={"avatar_path": f"hera/uploads/xxx/{uuid.uuid4()}.png"})
        assert r.status_code == 400
        assert "unknown" in r.json()["detail"].lower()


# ------- RESET ---------------------------------------------------------------
class TestResetJourney:
    def test_reset_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/account/reset")
        assert r.status_code == 401

    def test_reset_returns_ok(self, auth):
        s, *_ = auth
        # Seed a journal entry so reset has something to delete
        s.post(f"{BASE_URL}/api/journal",
               json={"kind": "gratitude", "content": "TEST_ for reset"})
        before = s.get(f"{BASE_URL}/api/journal").json()
        assert any("TEST_ for reset" in e["content"] for e in before)

        r = s.post(f"{BASE_URL}/api/account/reset")
        assert r.status_code == 200, r.text
        assert r.json() == {"ok": True}

        # Journal is now empty for this user
        after = s.get(f"{BASE_URL}/api/journal").json()
        assert after == []


# ------- Cleanup --------------------------------------------------------------
def test_zz_cleanup(auth):
    s, *_ = auth
    r = s.delete(f"{BASE_URL}/api/account")
    assert r.status_code == 200
