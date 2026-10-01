"""Hera manifestation app - comprehensive backend tests.

Covers: auth, stats, affirmations, journal, goals, upload/download, coach SSE,
discover, sessions, premium activation (MOCKED).
"""
import io
import json
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://manifest-dreams-12.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

SEED_EMAIL = "maya@hera.app"
SEED_PASSWORD = "hera1234"


@pytest.fixture(scope="session")
def session_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def seed_token(session_client):
    r = session_client.post(f"{API}/auth/login", json={"email": SEED_EMAIL, "password": SEED_PASSWORD})
    assert r.status_code == 200, f"Seed login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def seed_auth_header(seed_token):
    return {"Authorization": f"Bearer {seed_token}"}


@pytest.fixture(scope="session")
def new_user(session_client):
    email = f"TEST_{uuid.uuid4().hex[:10]}@hera.app"
    pw = "testpw1234"
    r = session_client.post(f"{API}/auth/register", json={"name": "TEST User", "email": email, "password": pw})
    assert r.status_code == 201, r.text
    data = r.json()
    return {"email": email, "password": pw, "token": data["access_token"], "user": data["user"]}


@pytest.fixture(scope="session")
def new_auth_header(new_user):
    return {"Authorization": f"Bearer {new_user['token']}"}


# ---------- auth
class TestAuth:
    def test_register_duplicate_returns_409(self, session_client, new_user):
        r = session_client.post(f"{API}/auth/register",
                                json={"name": "x", "email": new_user["email"], "password": "whatever"})
        assert r.status_code == 409

    def test_login_wrong_password(self, session_client):
        r = session_client.post(f"{API}/auth/login", json={"email": SEED_EMAIL, "password": "wrongwrong"})
        assert r.status_code == 401

    def test_me_returns_user(self, session_client, seed_auth_header):
        r = session_client.get(f"{API}/auth/me", headers=seed_auth_header)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == SEED_EMAIL
        assert "id" in d and "is_premium" in d

    def test_me_without_token_401(self, session_client):
        r = session_client.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- stats & affirmations
class TestAffirmations:
    def test_stats_shape(self, session_client, seed_auth_header):
        r = session_client.get(f"{API}/stats", headers=seed_auth_header)
        assert r.status_code == 200
        d = r.json()
        for k in ("streak", "journal_count", "goals_count", "goals_achieved", "sessions_done", "affirmed_today"):
            assert k in d

    def test_today_returns_text(self, session_client, seed_auth_header):
        r = session_client.get(f"{API}/affirmations/today", headers=seed_auth_header)
        assert r.status_code == 200
        assert isinstance(r.json().get("text"), str) and len(r.json()["text"]) > 0

    def test_affirm_increments_streak(self, session_client, new_auth_header):
        r = session_client.post(f"{API}/affirmations/affirm", headers=new_auth_header)
        assert r.status_code == 200
        assert r.json()["streak"] >= 1

    def test_generate_affirmation_ai(self, session_client, new_auth_header):
        r = session_client.post(f"{API}/affirmations/generate",
                                headers=new_auth_header, json={"intention": "financial abundance"},
                                timeout=90)
        assert r.status_code == 200, r.text
        text = r.json().get("text", "")
        assert isinstance(text, str) and len(text) > 5

    def test_favorites_add_list_delete(self, session_client, new_auth_header):
        # add
        r = session_client.post(f"{API}/affirmations/favorites",
                                headers=new_auth_header, json={"text": "TEST_fav_affirmation"})
        assert r.status_code == 200
        fav_id = r.json()["id"]
        # list
        r2 = session_client.get(f"{API}/affirmations/favorites", headers=new_auth_header)
        assert r2.status_code == 200
        assert any(f["id"] == fav_id for f in r2.json())
        # delete
        r3 = session_client.delete(f"{API}/affirmations/favorites/{fav_id}", headers=new_auth_header)
        assert r3.status_code == 200
        r4 = session_client.get(f"{API}/affirmations/favorites", headers=new_auth_header)
        assert not any(f["id"] == fav_id for f in r4.json())


# ---------- journal
class TestJournal:
    def test_crud_and_isolation(self, session_client, new_auth_header, seed_auth_header):
        r = session_client.post(f"{API}/journal", headers=new_auth_header,
                                json={"kind": "gratitude", "title": "TEST_t", "content": "TEST_content",
                                      "mood": 4})
        assert r.status_code == 201, r.text
        entry = r.json()
        assert entry["title"] == "TEST_t"
        eid = entry["id"]

        # listed for owner
        r2 = session_client.get(f"{API}/journal", headers=new_auth_header)
        assert r2.status_code == 200
        assert any(e["id"] == eid for e in r2.json())

        # NOT listed for seed user
        r3 = session_client.get(f"{API}/journal", headers=seed_auth_header)
        assert r3.status_code == 200
        assert not any(e["id"] == eid for e in r3.json())

        # seed user cannot delete
        r4 = session_client.delete(f"{API}/journal/{eid}", headers=seed_auth_header)
        assert r4.status_code == 404

        # owner deletes
        r5 = session_client.delete(f"{API}/journal/{eid}", headers=new_auth_header)
        assert r5.status_code == 200

        r6 = session_client.delete(f"{API}/journal/{eid}", headers=new_auth_header)
        assert r6.status_code == 404


# ---------- goals + upload/download
PNG_1x1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc```\x00\x00\x00\x04\x00\x01"
    b"\xf6\x178\x55\x00\x00\x00\x00IEND\xaeB`\x82"
)


class TestGoalsAndUpload:
    def test_upload_image_and_create_goal_and_file_isolation(self, session_client, new_user, seed_auth_header):
        token = new_user["token"]
        # multipart upload
        up = requests.post(f"{API}/upload", headers={"Authorization": f"Bearer {token}"},
                           files={"file": ("test.png", io.BytesIO(PNG_1x1), "image/png")}, timeout=60)
        if up.status_code == 402:
            pytest.skip("Storage credits exhausted (environment issue, not code bug)")
        assert up.status_code == 200, up.text
        path = up.json()["path"]
        assert isinstance(path, str) and path

        # download with token in query (owner)
        d1 = requests.get(f"{API}/files/{path}", params={"token": token}, timeout=60)
        assert d1.status_code == 200
        assert len(d1.content) > 0

        # Other user cannot access the file
        other_token = seed_auth_header["Authorization"].split(" ", 1)[1]
        d2 = requests.get(f"{API}/files/{path}", params={"token": other_token}, timeout=60)
        assert d2.status_code == 404

        # create goal with image path
        r = session_client.post(f"{API}/goals", headers={"Authorization": f"Bearer {token}"},
                                json={"title": "TEST_goal", "category": "Career", "image_path": path})
        assert r.status_code == 201, r.text
        gid = r.json()["id"]

        # patch achieved
        rp = session_client.patch(f"{API}/goals/{gid}", headers={"Authorization": f"Bearer {token}"},
                                  json={"achieved": True})
        assert rp.status_code == 200 and rp.json()["achieved"] is True

        # another user cannot patch
        rp2 = session_client.patch(f"{API}/goals/{gid}", headers=seed_auth_header, json={"achieved": False})
        assert rp2.status_code == 404

        # list goals
        rl = session_client.get(f"{API}/goals", headers={"Authorization": f"Bearer {token}"})
        assert rl.status_code == 200 and any(g["id"] == gid for g in rl.json())

        # delete
        rd = session_client.delete(f"{API}/goals/{gid}", headers={"Authorization": f"Bearer {token}"})
        assert rd.status_code == 200

    def test_create_goal_without_image(self, session_client, new_auth_header):
        r = session_client.post(f"{API}/goals", headers=new_auth_header,
                                json={"title": "TEST_simple_goal", "category": "Life"})
        assert r.status_code == 201
        gid = r.json()["id"]
        session_client.delete(f"{API}/goals/{gid}", headers=new_auth_header)

    def test_create_goal_with_unknown_image_rejected(self, session_client, new_auth_header):
        r = session_client.post(f"{API}/goals", headers=new_auth_header,
                                json={"title": "TEST_bad", "image_path": "hera-manifestation/uploads/fake/x.png"})
        assert r.status_code == 400


# ---------- coach SSE
class TestCoach:
    def test_stream_and_persistence(self, session_client, new_auth_header):
        # clear first
        session_client.delete(f"{API}/coach/messages", headers=new_auth_header)
        prompt = "In one short sentence, affirm I am worthy."
        with requests.post(f"{API}/coach/stream",
                           headers={**new_auth_header, "Content-Type": "application/json",
                                    "Accept": "text/event-stream"},
                           json={"text": prompt}, stream=True, timeout=120) as r:
            assert r.status_code == 200
            got_delta = False
            got_done = False
            for line in r.iter_lines(decode_unicode=True):
                if not line or not line.startswith("data:"):
                    continue
                evt = json.loads(line[5:].strip())
                if "delta" in evt:
                    got_delta = True
                if evt.get("done"):
                    got_done = True
                    break
            assert got_delta, "No delta events in stream"
            assert got_done, "No done event"

        r2 = session_client.get(f"{API}/coach/messages", headers=new_auth_header)
        assert r2.status_code == 200
        msgs = r2.json()
        assert any(m["role"] == "user" and m["text"] == prompt for m in msgs)
        assert any(m["role"] == "assistant" and m["text"] for m in msgs)

    def test_clear_messages(self, session_client, new_auth_header):
        r = session_client.delete(f"{API}/coach/messages", headers=new_auth_header)
        assert r.status_code == 200
        r2 = session_client.get(f"{API}/coach/messages", headers=new_auth_header)
        assert r2.json() == []


# ---------- discover + sessions
class TestContent:
    def test_discover_all(self, session_client):
        r = session_client.get(f"{API}/discover")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) > 0

    def test_discover_filter(self, session_client):
        r = session_client.get(f"{API}/discover", params={"category": "Mindset"})
        assert r.status_code == 200
        for it in r.json():
            assert it["category"] == "Mindset"

    def test_discover_item_detail(self, session_client):
        all_items = session_client.get(f"{API}/discover").json()
        did = all_items[0]["id"]
        r = session_client.get(f"{API}/discover/{did}")
        assert r.status_code == 200 and r.json()["id"] == did
        r2 = session_client.get(f"{API}/discover/does-not-exist")
        assert r2.status_code == 404

    def test_sessions_list_and_item(self, session_client):
        r = session_client.get(f"{API}/sessions")
        assert r.status_code == 200
        items = r.json()
        assert len(items) > 0
        sid = items[0]["id"]
        r2 = session_client.get(f"{API}/sessions/{sid}")
        assert r2.status_code == 200 and r2.json()["id"] == sid

    def test_session_complete(self, session_client, new_auth_header):
        items = session_client.get(f"{API}/sessions").json()
        sid = items[0]["id"]
        r = session_client.post(f"{API}/sessions/complete", headers=new_auth_header, json={"session_id": sid})
        assert r.status_code == 200
        assert "streak" in r.json()


# ---------- premium (MOCKED)
class TestPremium:
    def test_activate_mocked(self, session_client, new_auth_header):
        r = session_client.post(f"{API}/premium/activate", headers=new_auth_header)
        assert r.status_code == 200
        assert r.json()["is_premium"] is True
        # verify persisted
        r2 = session_client.get(f"{API}/auth/me", headers=new_auth_header)
        assert r2.json()["is_premium"] is True
