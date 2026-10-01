"""Hera coach - Claude (claude-sonnet-5-5) specific tests.

Verifies:
 - POST /api/coach/stream emits SSE deltas and done sentinel
 - Reply is personalized using user's name (seed user: "Maya")
 - Reply is plain text (no markdown asterisks/bullets)
 - Context memory: assistant recalls user-provided facts from history (30 msg window)
 - GET /api/coach/messages returns persisted ordered user+assistant messages
 - DELETE /api/coach/messages clears the thread
 - POST /api/affirmations/generate works with Claude
"""
import json
import os
import re
import time
import uuid

import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


# ---- helpers
def stream_coach(auth_header, text, timeout=180):
    """Open /coach/stream, collect deltas, return (full_text, got_done, raw_lines)."""
    full = ""
    got_done = False
    raw = []
    with requests.post(
        f"{API}/coach/stream",
        headers={**auth_header, "Content-Type": "application/json", "Accept": "text/event-stream"},
        json={"text": text},
        stream=True,
        timeout=timeout,
    ) as r:
        assert r.status_code == 200, f"stream status {r.status_code}: {r.text}"
        for line in r.iter_lines(decode_unicode=True):
            if not line or not line.startswith("data:"):
                continue
            raw.append(line)
            evt = json.loads(line[5:].strip())
            if "delta" in evt:
                full += evt["delta"]
            if "error" in evt:
                raise AssertionError(f"stream error event: {evt['error']}")
            if evt.get("done"):
                got_done = True
                break
    return full, got_done, raw


# ---- fixtures
@pytest.fixture(scope="module")
def seed_token():
    r = requests.post(f"{API}/auth/login", json={"email": "maya@hera.app", "password": "hera1234"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def seed_auth(seed_token):
    return {"Authorization": f"Bearer {seed_token}"}


@pytest.fixture
def fresh_user():
    """Each test gets its own user => isolated coach thread."""
    email = f"TEST_claude_{uuid.uuid4().hex[:8]}@hera.app"
    pw = "claudepw1234"
    r = requests.post(f"{API}/auth/register", json={"name": "Luna", "email": email, "password": pw})
    assert r.status_code == 201, r.text
    tok = r.json()["access_token"]
    return {"token": tok, "auth": {"Authorization": f"Bearer {tok}"}, "name": "Luna"}


# ---- tests

class TestCoachClaudeBasics:
    def test_stream_emits_delta_and_done(self, fresh_user):
        full, done, raw = stream_coach(fresh_user["auth"], "Hi Hera, say hello in one short sentence.")
        assert done, "no done sentinel"
        assert len(raw) >= 2, f"expected multiple SSE events, got {len(raw)}"
        assert full.strip(), "no text accumulated from deltas"

    def test_reply_personalized_with_user_name(self, fresh_user):
        full, done, _ = stream_coach(fresh_user["auth"],
                                     "Please greet me warmly and include my first name.")
        assert done
        assert "Luna" in full, f"user name not personalized into reply: {full!r}"

    def test_reply_plain_text_no_markdown(self, fresh_user):
        full, done, _ = stream_coach(fresh_user["auth"],
                                     "Share a short grounding thought for me today.")
        assert done
        # system prompt forbids markdown asterisks/headings/bullet symbols
        assert "**" not in full, f"found markdown bold: {full!r}"
        assert not re.search(r"(^|\n)\s*#{1,6}\s", full), f"found markdown heading: {full!r}"
        assert not re.search(r"(^|\n)\s*[*•]\s", full), f"found bullet symbol: {full!r}"

    def test_reply_is_warm_and_spiritual(self, fresh_user):
        full, done, _ = stream_coach(fresh_user["auth"], "I want to manifest more peace in my life.")
        assert done
        assert len(full) > 20
        # Hera is spiritually-grounded coach; soft heuristic
        warm_markers = ["love", "trust", "gentle", "breath", "energy", "intention", "manifest",
                        "beautiful", "sacred", "peace", "aligned", "heart", "soul", "grateful"]
        lower = full.lower()
        matches = [w for w in warm_markers if w in lower]
        assert matches, f"reply lacks any warm/spiritual markers: {full!r}"


class TestCoachContextMemory:
    def test_remembers_user_fact_across_turns(self, fresh_user):
        auth = fresh_user["auth"]
        # Turn 1: share a fact
        full1, done1, _ = stream_coach(auth, "My favorite color is lavender. Just remember that for me.")
        assert done1 and full1.strip()
        # Small gap so the assistant message is fully committed to DB before next turn reads history
        time.sleep(0.5)
        # Turn 2: ask about it
        full2, done2, _ = stream_coach(auth, "What is my favorite color? Answer with just the color.")
        assert done2
        assert "lavender" in full2.lower(), (
            f"Context memory FAIL: assistant did not recall 'lavender'. Reply: {full2!r}"
        )


class TestCoachPersistence:
    def test_messages_persisted_in_order(self, fresh_user):
        auth = fresh_user["auth"]
        requests.delete(f"{API}/coach/messages", headers=auth)
        prompt = "Give me a one-line affirmation."
        full, done, _ = stream_coach(auth, prompt)
        assert done and full.strip()

        r = requests.get(f"{API}/coach/messages", headers=auth)
        assert r.status_code == 200
        msgs = r.json()
        assert len(msgs) >= 2
        # User message is first, assistant second
        assert msgs[0]["role"] == "user" and msgs[0]["text"] == prompt
        assert msgs[1]["role"] == "assistant" and msgs[1]["text"].strip()

    def test_clear_messages(self, fresh_user):
        auth = fresh_user["auth"]
        stream_coach(auth, "Short hi.")
        rl = requests.get(f"{API}/coach/messages", headers=auth).json()
        assert len(rl) >= 2
        rd = requests.delete(f"{API}/coach/messages", headers=auth)
        assert rd.status_code == 200 and rd.json() == {"ok": True}
        assert requests.get(f"{API}/coach/messages", headers=auth).json() == []


class TestAffirmationGenerateClaude:
    def test_generate_returns_affirmation(self, fresh_user):
        r = requests.post(f"{API}/affirmations/generate",
                          headers={**fresh_user["auth"], "Content-Type": "application/json"},
                          json={"intention": "self-love and abundance"},
                          timeout=90)
        assert r.status_code == 200, r.text
        text = r.json().get("text", "")
        assert isinstance(text, str) and len(text.split()) >= 5
        assert '"' not in text  # system prompt says no quotes
