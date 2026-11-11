# Vision board image-link resolver/proxy tests (/api/images/resolve, /api/images/proxy)
import os
import pytest
import requests
from urllib.parse import quote


def _base():
    url = os.environ.get('EXPO_BACKEND_URL') or os.environ.get('EXPO_PUBLIC_BACKEND_URL')
    if not url:
        with open('/app/frontend/.env') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    url = line.split('=', 1)[1].strip().strip('"')
    return url.rstrip('/')


BASE_URL = _base()
PIXABAY = "https://cdn.pixabay.com/photo/2015/04/23/22/00/tree-736885_1280.jpg"
UNSPLASH = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800"


def _resolve(u):
    return requests.get(f"{BASE_URL}/api/images/resolve", params={"url": u}, timeout=30)


def _proxy(u):
    return requests.get(f"{BASE_URL}/api/images/proxy", params={"url": u}, timeout=30)


# ---- resolve
class TestResolve:
    def test_google_imgres_decoded(self):
        g = f"https://www.google.com/imgres?imgurl={quote(PIXABAY, safe='')}&imgrefurl=https%3A%2F%2Fpixabay.com"
        r = _resolve(g)
        assert r.status_code == 200, r.text
        assert r.json()["url"] == PIXABAY

    def test_direct_pixabay(self):
        r = _resolve(PIXABAY)
        assert r.status_code == 200, r.text
        assert r.json()["url"] == PIXABAY

    def test_direct_unsplash(self):
        r = _resolve(UNSPLASH)
        assert r.status_code == 200, r.text
        assert r.json()["url"].startswith("https://images.unsplash.com/")

    def test_not_a_url_400(self):
        r = _resolve("notaurl")
        assert r.status_code == 400
        assert "valid image link" in r.json()["detail"]

    def test_ssrf_loopback_400(self):
        assert _resolve("http://127.0.0.1:8001/api/health").status_code == 400

    def test_ssrf_private_400(self):
        assert _resolve("http://10.0.0.1/x.jpg").status_code == 400
        assert _resolve("http://localhost:8001/api/health").status_code == 400

    def test_ssrf_google_wrapping_private_400(self):
        g = "https://www.google.com/imgres?imgurl=" + quote("http://127.0.0.1:8001/api/health", safe='')
        assert _resolve(g).status_code == 400

    def test_blocked_page_422_helpful(self):
        r = _resolve("https://pixabay.com/photos/tree-sunset-clouds-sky-736885/")
        assert r.status_code in (200, 422), r.text
        if r.status_code == 422:
            print("pixabay page detail:", r.json()["detail"])
            assert "Copy image address" in r.json()["detail"] or "image" in r.json()["detail"].lower()

    def test_unreachable_422(self):
        r = _resolve("https://nonexistent-host-abc123xyz.invalid/img.jpg")
        # DNS fails -> _public_http_url false -> 400; acceptable either 400/422
        assert r.status_code in (400, 422)


# ---- proxy
class TestProxy:
    def test_proxy_pixabay_jpeg(self):
        r = _proxy(PIXABAY)
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("image/jpeg")
        assert len(r.content) > 1000

    def test_proxy_non_image_422(self):
        r = _proxy("https://example.com/")
        assert r.status_code == 422

    def test_proxy_private_400(self):
        assert _proxy("http://127.0.0.1:8001/api/health").status_code == 400
        assert _proxy("http://192.168.1.1/a.jpg").status_code == 400


# ---- journal data isolation between accounts (backend scoping by user_id)
import hashlib
from pymongo import MongoClient
from dotenv import dotenv_values


def _token(email, code):
    if email != "demo@heraapp.com":
        env = dotenv_values("/app/backend/.env")
        requests.post(f"{BASE_URL}/api/auth/otp/send", json={"email": email}, timeout=30)
        h = hashlib.sha256(f"{email}:{code}:{env['JWT_SECRET']}".encode()).hexdigest()
        MongoClient(env["MONGO_URL"])[env["DB_NAME"]].otps.update_many({"email": email}, {"$set": {"code_hash": h, "attempts": 0}})
    r = requests.post(f"{BASE_URL}/api/auth/otp/verify", json={"email": email, "code": code}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"login failed {email}: {r.status_code} {r.text[:120]}")
    return r.json()["access_token"]


class TestJournalIsolation:
    def test_other_user_cannot_see_or_delete(self):
        ta = _token("demo@heraapp.com", "1234")
        tb = _token("delivered@resend.dev", "4321")
        ha, hb = {"Authorization": f"Bearer {ta}"}, {"Authorization": f"Bearer {tb}"}
        c = requests.post(f"{BASE_URL}/api/journal", headers=ha, json={"title": "TEST_A_ISO", "content": "secret", "mood": 3, "type": "daily"}, timeout=30)
        assert c.status_code == 201, c.text
        eid = c.json()["id"]
        try:
            lb = requests.get(f"{BASE_URL}/api/journal", headers=hb, timeout=30).json()
            assert all(e["id"] != eid for e in lb)
            assert requests.delete(f"{BASE_URL}/api/journal/{eid}", headers=hb, timeout=30).status_code == 404
            la = requests.get(f"{BASE_URL}/api/journal", headers=ha, timeout=30).json()
            assert any(e["id"] == eid for e in la)
        finally:
            requests.delete(f"{BASE_URL}/api/journal/{eid}", headers=ha, timeout=30)
