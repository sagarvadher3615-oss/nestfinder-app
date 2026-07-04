"""
NestFinder backend API test suite.
Covers: auth (register/login/me/role), properties (list/filter/get/create/mine/delete),
bookings (create/mine/landlord/patch), and unauthorized access checks.
"""
import os
import uuid
import time
import pytest
import requests

# Read backend URL strictly from env (no default)
BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
if not BASE_URL:
    # fallback to frontend .env
    from pathlib import Path
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


# ------------ fixtures ------------
@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def tenant_token(s):
    r = s.post(f"{API}/auth/login", json={"email": TENANT_EMAIL, "password": DEMO_PWD}, timeout=20)
    assert r.status_code == 200, f"tenant login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["role"] == "tenant"
    return data["token"]


@pytest.fixture(scope="session")
def landlord_token(s):
    r = s.post(f"{API}/auth/login", json={"email": LANDLORD_EMAIL, "password": DEMO_PWD}, timeout=20)
    assert r.status_code == 200, f"landlord login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "landlord"
    return data["token"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ------------ health ------------
class TestHealth:
    def test_root(self, s):
        r = s.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ------------ auth ------------
class TestAuth:
    def test_login_tenant(self, tenant_token):
        assert tenant_token and isinstance(tenant_token, str)

    def test_login_landlord(self, landlord_token):
        assert landlord_token and isinstance(landlord_token, str)

    def test_login_invalid(self, s):
        r = s.post(f"{API}/auth/login", json={"email": TENANT_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me_requires_token(self, s):
        r = s.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_invalid_token(self, s):
        r = s.get(f"{API}/auth/me", headers={"Authorization": "Bearer garbage"}, timeout=15)
        assert r.status_code == 401

    def test_me_tenant(self, s, tenant_token):
        r = s.get(f"{API}/auth/me", headers=_h(tenant_token), timeout=15)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == TENANT_EMAIL
        assert u["role"] == "tenant"

    def test_register_and_duplicate(self, s):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        payload = {"name": "Test User", "email": email, "password": "Passw0rd!", "role": "tenant"}
        r1 = s.post(f"{API}/auth/register", json=payload, timeout=15)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1["user"]["email"] == email
        assert "token" in d1

        # duplicate
        r2 = s.post(f"{API}/auth/register", json=payload, timeout=15)
        assert r2.status_code == 400

        # verify persistence via /auth/me
        r3 = s.get(f"{API}/auth/me", headers=_h(d1["token"]), timeout=15)
        assert r3.status_code == 200
        assert r3.json()["email"] == email

    def test_role_toggle(self, s):
        # register a fresh user, toggle role, verify
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/register", json={"name": "Toggle", "email": email, "password": "Passw0rd!", "role": "tenant"}, timeout=15)
        tok = r.json()["token"]
        rp = s.patch(f"{API}/auth/role", headers=_h(tok), json={"role": "landlord"}, timeout=15)
        assert rp.status_code == 200
        assert rp.json()["role"] == "landlord"
        me = s.get(f"{API}/auth/me", headers=_h(tok), timeout=15).json()
        assert me["role"] == "landlord"

        # invalid role rejected
        rb = s.patch(f"{API}/auth/role", headers=_h(tok), json={"role": "admin"}, timeout=15)
        assert rb.status_code == 400


# ------------ properties ------------
class TestProperties:
    def test_list_seed_has_8(self, s):
        r = s.get(f"{API}/properties", timeout=20)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        # seed count is 8
        assert len(arr) >= 8, f"expected >=8 seed properties, got {len(arr)}"
        first = arr[0]
        for k in ("property_id", "title", "location", "price", "property_type", "bedrooms"):
            assert k in first

    def test_filter_by_type(self, s):
        r = s.get(f"{API}/properties?property_type=2BHK", timeout=15)
        assert r.status_code == 200
        for p in r.json():
            assert p["property_type"] == "2BHK"

    def test_filter_price_range(self, s):
        r = s.get(f"{API}/properties?min_price=10000&max_price=20000", timeout=15)
        assert r.status_code == 200
        for p in r.json():
            assert 10000 <= p["price"] <= 20000

    def test_filter_search_q(self, s):
        r = s.get(f"{API}/properties?q=Bangalore", timeout=15)
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) > 0
        assert any("Bangalore" in p["location"] for p in arr)

    def test_filter_bedrooms(self, s):
        r = s.get(f"{API}/properties?bedrooms=2", timeout=15)
        assert r.status_code == 200
        for p in r.json():
            assert p["bedrooms"] == 2

    def test_get_single(self, s):
        arr = s.get(f"{API}/properties", timeout=15).json()
        pid = arr[0]["property_id"]
        r = s.get(f"{API}/properties/{pid}", timeout=15)
        assert r.status_code == 200
        assert r.json()["property_id"] == pid

    def test_get_single_404(self, s):
        r = s.get(f"{API}/properties/nope_xyz", timeout=15)
        assert r.status_code == 404

    def test_tenant_cannot_create(self, s, tenant_token):
        payload = {
            "title": "TEST_should_fail", "location": "Nowhere", "price": 1000,
            "property_type": "1BHK", "bedrooms": 1, "bathrooms": 1,
            "description": "x", "amenities": [], "images": [],
        }
        r = s.post(f"{API}/properties", headers=_h(tenant_token), json=payload, timeout=15)
        assert r.status_code == 403

    def test_create_requires_auth(self, s):
        r = s.post(f"{API}/properties", json={"title": "x", "location": "y", "price": 1, "property_type": "1BHK", "bedrooms": 1}, timeout=15)
        assert r.status_code == 401

    def test_landlord_create_get_mine_delete(self, s, landlord_token):
        payload = {
            "title": f"TEST_{uuid.uuid4().hex[:6]}", "location": "Test City", "price": 12345,
            "property_type": "1BHK", "bedrooms": 1, "bathrooms": 1,
            "description": "test", "amenities": ["WiFi"], "images": [],
        }
        r = s.post(f"{API}/properties", headers=_h(landlord_token), json=payload, timeout=15)
        assert r.status_code == 200, r.text
        prop = r.json()
        pid = prop["property_id"]
        assert prop["title"] == payload["title"]
        assert prop["landlord_id"]

        # GET single verifies persistence
        got = s.get(f"{API}/properties/{pid}", timeout=15)
        assert got.status_code == 200
        assert got.json()["price"] == 12345

        # /mine contains it
        mine = s.get(f"{API}/properties/mine", headers=_h(landlord_token), timeout=15)
        assert mine.status_code == 200
        assert any(p["property_id"] == pid for p in mine.json())

        # tenant cannot delete
        # First create tenant token here reusing session-scoped fixture would need param — inline login
        tr = s.post(f"{API}/auth/login", json={"email": TENANT_EMAIL, "password": DEMO_PWD}, timeout=15).json()
        del_t = s.delete(f"{API}/properties/{pid}", headers=_h(tr["token"]), timeout=15)
        assert del_t.status_code == 403

        # owner delete works
        d = s.delete(f"{API}/properties/{pid}", headers=_h(landlord_token), timeout=15)
        assert d.status_code == 200
        # confirm 404 after delete
        gone = s.get(f"{API}/properties/{pid}", timeout=15)
        assert gone.status_code == 404


# ------------ bookings ------------
class TestBookings:
    booking_id = None
    prop_id = None

    def test_create_booking(self, s, tenant_token):
        arr = s.get(f"{API}/properties", timeout=15).json()
        # Pick a property owned by the demo landlord so accept-as-landlord works
        demo_props = [p for p in arr if p["landlord_id"] == "user_demo_landlord" and p.get("status", "available") == "available"]
        assert demo_props, "no demo-landlord property available for booking"
        pid = demo_props[0]["property_id"]
        TestBookings.prop_id = pid
        payload = {"property_id": pid, "tenant_name": "TEST Tenant", "tenant_phone": "+919999999999", "move_in_date": "2026-02-01"}
        r = s.post(f"{API}/bookings", headers=_h(tenant_token), json=payload, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "pending"
        assert d["property_id"] == pid
        TestBookings.booking_id = d["booking_id"]

    def test_bookings_mine(self, s, tenant_token):
        r = s.get(f"{API}/bookings/mine", headers=_h(tenant_token), timeout=15)
        assert r.status_code == 200
        assert any(b["booking_id"] == TestBookings.booking_id for b in r.json())

    def test_bookings_landlord(self, s, landlord_token):
        r = s.get(f"{API}/bookings/landlord", headers=_h(landlord_token), timeout=15)
        assert r.status_code == 200
        assert any(b["booking_id"] == TestBookings.booking_id for b in r.json())

    def test_patch_accept_as_landlord(self, s, landlord_token):
        r = s.patch(f"{API}/bookings/{TestBookings.booking_id}", headers=_h(landlord_token), json={"status": "accepted"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "accepted"

    def test_patch_forbidden_other_user(self, s):
        # register random user
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/register", json={"name": "Rando", "email": email, "password": "Passw0rd!", "role": "tenant"}, timeout=15)
        tok = r.json()["token"]
        rp = s.patch(f"{API}/bookings/{TestBookings.booking_id}", headers=_h(tok), json={"status": "cancelled"}, timeout=15)
        assert rp.status_code == 403

    def test_patch_cancel_as_tenant(self, s, tenant_token):
        r = s.patch(f"{API}/bookings/{TestBookings.booking_id}", headers=_h(tenant_token), json={"status": "cancelled"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "cancelled"

    def test_bookings_require_auth(self, s):
        r = s.get(f"{API}/bookings/mine", timeout=15)
        assert r.status_code == 401
