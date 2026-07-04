"""
NestFinder Phase 2 backend tests.
Covers: chat (threads/messages, idempotency, self-message 400, unknown property 404,
outsider 403, empty text 400, last_message update, other_name/other_verified decoration),
property lat/lng (seed migration + Nominatim geocode on create).
"""
import os
import uuid
import pytest
import requests
from pathlib import Path

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
if not BASE_URL:
    envp = Path("/app/frontend/.env")
    if envp.exists():
        for line in envp.read_text().splitlines():
            if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"')
                break
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL must be defined"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

TENANT_EMAIL = "tenant@nestfinder.app"
LANDLORD_EMAIL = "landlord@nestfinder.app"
DEMO_PWD = "Demo123!"


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def tenant_token(s):
    r = s.post(f"{API}/auth/login", json={"email": TENANT_EMAIL, "password": DEMO_PWD}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def landlord_token(s):
    r = s.post(f"{API}/auth/login", json={"email": LANDLORD_EMAIL, "password": DEMO_PWD}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def demo_property(s):
    """Pick a seed property owned by the demo landlord."""
    arr = s.get(f"{API}/properties", timeout=20).json()
    props = [p for p in arr if p["landlord_id"] == "user_demo_landlord"]
    assert props, "no demo-landlord property found"
    return props[0]


def _h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ---------- property lat/lng ----------
class TestPropertyCoords:
    def test_seed_properties_have_latlng(self, s):
        arr = s.get(f"{API}/properties", timeout=20).json()
        demo = [p for p in arr if p["landlord_id"] == "user_demo_landlord"]
        assert len(demo) >= 8, f"expected 8 demo seed properties, got {len(demo)}"
        for p in demo:
            assert p.get("lat") is not None, f"seed property missing lat: {p['title']}"
            assert p.get("lng") is not None, f"seed property missing lng: {p['title']}"
            assert isinstance(p["lat"], (int, float))
            assert isinstance(p["lng"], (int, float))

    def test_create_property_auto_geocode(self, s, landlord_token):
        payload = {
            "title": f"TEST_geo_{uuid.uuid4().hex[:6]}",
            "location": "Mumbai",
            "price": 25000,
            "property_type": "1BHK",
            "bedrooms": 1,
            "bathrooms": 1,
            "description": "TEST geocode",
            "amenities": [],
            "images": [],
        }
        r = s.post(f"{API}/properties", headers=_h(landlord_token), json=payload, timeout=30)
        assert r.status_code == 200, r.text
        prop = r.json()
        # accept either populated or null (Nominatim may be unreachable in some test envs)
        assert "lat" in prop and "lng" in prop
        if prop["lat"] is not None:
            # Mumbai is ~19.07 N, ~72.87 E; accept a loose range
            assert 17 < prop["lat"] < 21, f"unexpected lat: {prop['lat']}"
            assert 71 < prop["lng"] < 74, f"unexpected lng: {prop['lng']}"
        # cleanup
        s.delete(f"{API}/properties/{prop['property_id']}", headers=_h(landlord_token), timeout=15)

    def test_create_property_with_explicit_latlng(self, s, landlord_token):
        payload = {
            "title": f"TEST_ll_{uuid.uuid4().hex[:6]}",
            "location": "Nowhere Land",
            "price": 12000,
            "property_type": "1BHK",
            "bedrooms": 1,
            "bathrooms": 1,
            "description": "TEST explicit",
            "amenities": [],
            "images": [],
            "lat": 12.34,
            "lng": 56.78,
        }
        r = s.post(f"{API}/properties", headers=_h(landlord_token), json=payload, timeout=15)
        assert r.status_code == 200
        prop = r.json()
        assert prop["lat"] == 12.34
        assert prop["lng"] == 56.78
        s.delete(f"{API}/properties/{prop['property_id']}", headers=_h(landlord_token), timeout=15)


# ---------- chat threads ----------
class TestChatThreads:
    def test_create_thread_requires_auth(self, s, demo_property):
        r = s.post(f"{API}/chat/threads", json={"property_id": demo_property["property_id"]}, timeout=15)
        assert r.status_code == 401

    def test_create_thread_missing_property_id(self, s, tenant_token):
        r = s.post(f"{API}/chat/threads", headers=_h(tenant_token), json={}, timeout=15)
        assert r.status_code == 400

    def test_create_thread_unknown_property_404(self, s, tenant_token):
        r = s.post(f"{API}/chat/threads", headers=_h(tenant_token), json={"property_id": "prop_nope"}, timeout=15)
        assert r.status_code == 404

    def test_landlord_cannot_message_self_400(self, s, landlord_token, demo_property):
        r = s.post(
            f"{API}/chat/threads",
            headers=_h(landlord_token),
            json={"property_id": demo_property["property_id"]},
            timeout=15,
        )
        assert r.status_code == 400, r.text

    def test_create_thread_idempotent(self, s, tenant_token, demo_property):
        pid = demo_property["property_id"]
        r1 = s.post(f"{API}/chat/threads", headers=_h(tenant_token), json={"property_id": pid}, timeout=15)
        assert r1.status_code == 200, r1.text
        t1 = r1.json()
        assert t1.get("thread_id", "").startswith("th_")
        assert t1["property_id"] == pid
        assert t1["tenant_id"] and t1["landlord_id"]

        # second call should return the SAME thread_id
        r2 = s.post(f"{API}/chat/threads", headers=_h(tenant_token), json={"property_id": pid}, timeout=15)
        assert r2.status_code == 200
        t2 = r2.json()
        assert t2["thread_id"] == t1["thread_id"], "thread creation not idempotent"

    def test_list_threads_tenant_decoration(self, s, tenant_token, demo_property):
        # ensure a thread exists
        s.post(f"{API}/chat/threads", headers=_h(tenant_token), json={"property_id": demo_property["property_id"]}, timeout=15)
        r = s.get(f"{API}/chat/threads", headers=_h(tenant_token), timeout=15)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list) and len(arr) >= 1
        t = next((x for x in arr if x["property_id"] == demo_property["property_id"]), None)
        assert t is not None
        # decorated fields
        assert "other_name" in t and "other_verified" in t and "other_id" in t
        # tenant's counterpart is the landlord (demo landlord Priya Sharma)
        assert t["other_id"] == "user_demo_landlord"
        assert t["other_name"]  # non-empty
        assert isinstance(t["other_verified"], bool)

    def test_list_threads_landlord_decoration(self, s, landlord_token, tenant_token, demo_property):
        # tenant creates a thread first, then landlord views their list
        s.post(f"{API}/chat/threads", headers=_h(tenant_token), json={"property_id": demo_property["property_id"]}, timeout=15)
        r = s.get(f"{API}/chat/threads", headers=_h(landlord_token), timeout=15)
        assert r.status_code == 200
        arr = r.json()
        t = next((x for x in arr if x["property_id"] == demo_property["property_id"]), None)
        assert t is not None
        assert t["other_id"] == "user_demo_tenant"
        assert "other_name" in t and "other_verified" in t


# ---------- chat messages ----------
class TestChatMessages:
    thread_id = None

    @pytest.fixture(autouse=True, scope="class")
    def _setup(self, request):
        """Set up a thread via a shared session."""
        sess = requests.Session()
        # tenant token
        tr = sess.post(f"{API}/auth/login", json={"email": TENANT_EMAIL, "password": DEMO_PWD}, timeout=20).json()
        tenant_tok = tr["token"]
        arr = sess.get(f"{API}/properties", timeout=15).json()
        prop = next(p for p in arr if p["landlord_id"] == "user_demo_landlord")
        rt = sess.post(f"{API}/chat/threads", headers=_h(tenant_tok), json={"property_id": prop["property_id"]}, timeout=15)
        TestChatMessages.thread_id = rt.json()["thread_id"]

    def test_send_empty_text_400(self, s, tenant_token):
        r = s.post(
            f"{API}/chat/threads/{TestChatMessages.thread_id}/messages",
            headers=_h(tenant_token),
            json={"text": "   "},
            timeout=15,
        )
        assert r.status_code == 400

    def test_send_message_and_persistence(self, s, tenant_token):
        text = f"TEST hello from tenant {uuid.uuid4().hex[:6]}"
        r = s.post(
            f"{API}/chat/threads/{TestChatMessages.thread_id}/messages",
            headers=_h(tenant_token),
            json={"text": text},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        m = r.json()
        assert m["text"] == text
        assert m.get("message_id", "").startswith("msg_")
        assert m["thread_id"] == TestChatMessages.thread_id
        assert m["sender_id"] == "user_demo_tenant"

        # GET to verify persistence
        rl = s.get(f"{API}/chat/threads/{TestChatMessages.thread_id}/messages", headers=_h(tenant_token), timeout=15)
        assert rl.status_code == 200
        payload = rl.json()
        assert "thread" in payload and "messages" in payload
        assert any(x["message_id"] == m["message_id"] for x in payload["messages"])

    def test_last_message_updated_on_thread(self, s, tenant_token, landlord_token):
        text = f"TEST last-msg {uuid.uuid4().hex[:6]}"
        s.post(
            f"{API}/chat/threads/{TestChatMessages.thread_id}/messages",
            headers=_h(tenant_token),
            json={"text": text},
            timeout=15,
        )
        # check thread list picks up last_message
        arr = s.get(f"{API}/chat/threads", headers=_h(landlord_token), timeout=15).json()
        t = next((x for x in arr if x["thread_id"] == TestChatMessages.thread_id), None)
        assert t is not None
        assert t["last_message"] == text
        assert t.get("last_message_at")

    def test_landlord_can_read_and_reply(self, s, landlord_token):
        rl = s.get(f"{API}/chat/threads/{TestChatMessages.thread_id}/messages", headers=_h(landlord_token), timeout=15)
        assert rl.status_code == 200
        body = rl.json()
        assert body["thread"]["thread_id"] == TestChatMessages.thread_id

        # landlord replies
        reply = f"TEST landlord reply {uuid.uuid4().hex[:6]}"
        r = s.post(
            f"{API}/chat/threads/{TestChatMessages.thread_id}/messages",
            headers=_h(landlord_token),
            json={"text": reply},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["sender_id"] == "user_demo_landlord"

    def test_outsider_forbidden_read_403(self, s):
        # register a third-party user
        email = f"test_out_{uuid.uuid4().hex[:8]}@example.com"
        rr = s.post(f"{API}/auth/register", json={"name": "Outsider", "email": email, "password": "Passw0rd!", "role": "tenant"}, timeout=15)
        tok = rr.json()["token"]
        r = s.get(f"{API}/chat/threads/{TestChatMessages.thread_id}/messages", headers=_h(tok), timeout=15)
        assert r.status_code == 403

    def test_outsider_forbidden_send_403(self, s):
        email = f"test_out2_{uuid.uuid4().hex[:8]}@example.com"
        rr = s.post(f"{API}/auth/register", json={"name": "Outsider2", "email": email, "password": "Passw0rd!", "role": "tenant"}, timeout=15)
        tok = rr.json()["token"]
        r = s.post(
            f"{API}/chat/threads/{TestChatMessages.thread_id}/messages",
            headers=_h(tok),
            json={"text": "hack"},
            timeout=15,
        )
        assert r.status_code == 403

    def test_send_to_unknown_thread_404(self, s, tenant_token):
        r = s.post(f"{API}/chat/threads/th_doesnotexist/messages", headers=_h(tenant_token), json={"text": "hi"}, timeout=15)
        assert r.status_code == 404

    def test_get_unknown_thread_404(self, s, tenant_token):
        r = s.get(f"{API}/chat/threads/th_doesnotexist/messages", headers=_h(tenant_token), timeout=15)
        assert r.status_code == 404
