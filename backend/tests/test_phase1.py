"""
Phase-1 feature tests for NestFinder:
sort, available_only, favorites, reviews (with average), KYC (+auto-approve),
auth/me includes kyc_status, and landlord_verified on properties.
Also verifies regressions on existing endpoints.
"""
import os
import time
import uuid
import base64
import pytest
import requests
from pathlib import Path

# Resolve base URL (matches backend_test.py logic)
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


def _h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


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
def fresh_tenant(s):
    """Fresh tenant with no favorites / no reviews / kyc=none."""
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register", json={
        "name": "Fresh Tenant", "email": email, "password": "Passw0rd!", "role": "tenant"
    }, timeout=15)
    assert r.status_code == 200, r.text
    return {"token": r.json()["token"], "email": email, "user_id": r.json()["user"]["user_id"]}


# ------------ Sort & available_only ------------
class TestPropertyListingFilters:
    def test_sort_price_asc(self, s):
        r = s.get(f"{API}/properties?sort=price_asc", timeout=20)
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) >= 2
        prices = [p["price"] for p in arr]
        assert prices == sorted(prices), f"expected ascending prices, got {prices}"

    def test_sort_price_desc(self, s):
        r = s.get(f"{API}/properties?sort=price_desc", timeout=20)
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) >= 2
        prices = [p["price"] for p in arr]
        assert prices == sorted(prices, reverse=True), f"expected descending prices, got {prices}"

    def test_sort_newest_default(self, s):
        r = s.get(f"{API}/properties?sort=newest", timeout=20)
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) >= 1
        # created_at descending — successive items should be non-increasing
        times = [p["created_at"] for p in arr]
        assert times == sorted(times, reverse=True)

    def test_available_only(self, s):
        r = s.get(f"{API}/properties?available_only=true", timeout=20)
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) >= 8, f"expected all 8+ seed properties to be available, got {len(arr)}"
        for p in arr:
            assert p["status"] == "available", f"non-available leaked: {p['property_id']} {p['status']}"


# ------------ Favorites ------------
class TestFavorites:
    def test_requires_auth(self, s):
        assert s.get(f"{API}/favorites", timeout=10).status_code == 401
        assert s.post(f"{API}/favorites/some_pid", timeout=10).status_code == 401

    def test_toggle_and_list(self, s, fresh_tenant):
        tok = fresh_tenant["token"]
        props = s.get(f"{API}/properties", timeout=15).json()
        pid = props[0]["property_id"]

        # initially empty
        r0 = s.get(f"{API}/favorites", headers=_h(tok), timeout=15)
        assert r0.status_code == 200
        assert r0.json() == {"ids": [], "properties": []}

        # add
        r1 = s.post(f"{API}/favorites/{pid}", headers=_h(tok), timeout=15)
        assert r1.status_code == 200
        assert r1.json()["favorited"] is True

        # list contains it
        r2 = s.get(f"{API}/favorites", headers=_h(tok), timeout=15)
        assert r2.status_code == 200
        data = r2.json()
        assert pid in data["ids"]
        assert any(p["property_id"] == pid for p in data["properties"])

        # toggle off
        r3 = s.post(f"{API}/favorites/{pid}", headers=_h(tok), timeout=15)
        assert r3.status_code == 200
        assert r3.json()["favorited"] is False

        # list empty again
        r4 = s.get(f"{API}/favorites", headers=_h(tok), timeout=15)
        assert r4.json()["ids"] == []


# ------------ Reviews ------------
class TestReviews:
    def test_review_requires_auth(self, s):
        r = s.post(f"{API}/reviews", json={"property_id": "x", "rating": 5}, timeout=10)
        assert r.status_code == 401

    def test_invalid_rating_rejected(self, s, fresh_tenant):
        tok = fresh_tenant["token"]
        props = s.get(f"{API}/properties", timeout=15).json()
        pid = props[0]["property_id"]
        for bad in (0, 6, -1, 99):
            r = s.post(f"{API}/reviews", headers=_h(tok),
                       json={"property_id": pid, "rating": bad, "comment": "x"}, timeout=10)
            assert r.status_code == 400, f"rating={bad} should be 400, got {r.status_code}"

    def test_property_not_found(self, s, fresh_tenant):
        tok = fresh_tenant["token"]
        r = s.post(f"{API}/reviews", headers=_h(tok),
                   json={"property_id": "nope_xyz", "rating": 5, "comment": "hi"}, timeout=10)
        assert r.status_code == 404

    def test_create_list_average_and_duplicate(self, s):
        # register two fresh tenants who both review the same property
        e1 = f"test_{uuid.uuid4().hex[:8]}@example.com"
        e2 = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r1 = s.post(f"{API}/auth/register", json={"name": "R1", "email": e1, "password": "Passw0rd!", "role": "tenant"}, timeout=15)
        r2 = s.post(f"{API}/auth/register", json={"name": "R2", "email": e2, "password": "Passw0rd!", "role": "tenant"}, timeout=15)
        t1, t2 = r1.json()["token"], r2.json()["token"]

        props = s.get(f"{API}/properties", timeout=15).json()
        # Pick a property that has no reviews yet to keep average predictable
        pid = None
        for p in props:
            rv = s.get(f"{API}/reviews/{p['property_id']}", timeout=10).json()
            if rv["count"] == 0:
                pid = p["property_id"]
                break
        assert pid is not None, "no property without reviews to test on"

        # empty state
        empty = s.get(f"{API}/reviews/{pid}", timeout=10).json()
        assert empty == {"average": 0.0, "count": 0, "reviews": []}

        # first review 5 stars
        c1 = s.post(f"{API}/reviews", headers=_h(t1),
                    json={"property_id": pid, "rating": 5, "comment": "TEST great"}, timeout=15)
        assert c1.status_code == 200, c1.text
        assert c1.json()["rating"] == 5
        assert c1.json()["author_name"] == "R1"

        # second review by same user for same property -> 400
        dup = s.post(f"{API}/reviews", headers=_h(t1),
                     json={"property_id": pid, "rating": 4, "comment": "TEST again"}, timeout=15)
        assert dup.status_code == 400

        # other user posts 3-star review
        c2 = s.post(f"{API}/reviews", headers=_h(t2),
                    json={"property_id": pid, "rating": 3, "comment": "TEST ok"}, timeout=15)
        assert c2.status_code == 200

        # average = (5+3)/2 = 4.0, count = 2
        lst = s.get(f"{API}/reviews/{pid}", timeout=10).json()
        assert lst["count"] == 2
        assert lst["average"] == 4.0
        assert len(lst["reviews"]) == 2


# ------------ KYC ------------
class TestKyc:
    def test_kyc_requires_auth(self, s):
        assert s.get(f"{API}/kyc/status", timeout=10).status_code == 401
        assert s.post(f"{API}/kyc/submit", json={"document": "x"}, timeout=10).status_code == 401

    def test_kyc_submit_requires_document(self, s, fresh_tenant):
        tok = fresh_tenant["token"]
        r = s.post(f"{API}/kyc/submit", headers=_h(tok), json={}, timeout=10)
        assert r.status_code == 400

    def test_auth_me_includes_kyc_status(self, s, fresh_tenant):
        tok = fresh_tenant["token"]
        r = s.get(f"{API}/auth/me", headers=_h(tok), timeout=10)
        assert r.status_code == 200
        assert "kyc_status" in r.json()
        assert r.json()["kyc_status"] in ("none", "pending", "verified")

    def test_kyc_flow_pending_then_verified(self, s):
        # dedicated user so we don't pollute the demo landlord
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        rr = s.post(f"{API}/auth/register",
                    json={"name": "KYC User", "email": email, "password": "Passw0rd!", "role": "landlord"},
                    timeout=15)
        tok = rr.json()["token"]

        # initial status = none
        st0 = s.get(f"{API}/kyc/status", headers=_h(tok), timeout=10).json()
        assert st0["status"] == "none"

        # submit
        doc_b64 = base64.b64encode(b"fakepdfbytes").decode()
        sub = s.post(f"{API}/kyc/submit", headers=_h(tok),
                     json={"document": doc_b64}, timeout=10)
        assert sub.status_code == 200
        assert sub.json()["status"] == "pending"

        # immediately pending
        st1 = s.get(f"{API}/kyc/status", headers=_h(tok), timeout=10).json()
        assert st1["status"] == "pending"

        me1 = s.get(f"{API}/auth/me", headers=_h(tok), timeout=10).json()
        assert me1["kyc_status"] == "pending"

        # wait ~6s for auto-approve (server sleeps 5s)
        time.sleep(6.5)
        st2 = s.get(f"{API}/kyc/status", headers=_h(tok), timeout=10).json()
        assert st2["status"] == "verified", f"expected verified, got {st2}"

        me2 = s.get(f"{API}/auth/me", headers=_h(tok), timeout=10).json()
        assert me2["kyc_status"] == "verified"

    def test_landlord_verified_reflects_on_properties(self, s):
        # Create a landlord, verify KYC, add a property, then check landlord_verified=true
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        rr = s.post(f"{API}/auth/register",
                    json={"name": "Verified LL", "email": email, "password": "Passw0rd!", "role": "landlord"},
                    timeout=15)
        tok = rr.json()["token"]

        # create property BEFORE verification -> landlord_verified false
        payload = {
            "title": f"TEST_{uuid.uuid4().hex[:6]}", "location": "TestVille", "price": 9999,
            "property_type": "1BHK", "bedrooms": 1, "bathrooms": 1,
            "description": "kyc test", "amenities": [], "images": [],
        }
        cp = s.post(f"{API}/properties", headers=_h(tok), json=payload, timeout=15)
        assert cp.status_code == 200, cp.text
        pid = cp.json()["property_id"]

        pre = s.get(f"{API}/properties/{pid}", timeout=10).json()
        assert pre["landlord_verified"] is False

        # Submit KYC and wait
        s.post(f"{API}/kyc/submit", headers=_h(tok),
               json={"document": base64.b64encode(b"x").decode()}, timeout=10)
        time.sleep(6.5)

        post = s.get(f"{API}/properties/{pid}", timeout=10).json()
        assert post["landlord_verified"] is True, f"expected verified landlord, got {post['landlord_verified']}"

        # list endpoint too
        lst = s.get(f"{API}/properties", timeout=15).json()
        mine = [p for p in lst if p["property_id"] == pid]
        assert mine and mine[0]["landlord_verified"] is True

        # cleanup
        s.delete(f"{API}/properties/{pid}", headers=_h(tok), timeout=10)


# ------------ Regression: existing endpoints still respond ------------
class TestRegression:
    def test_properties_list_ok(self, s):
        assert s.get(f"{API}/properties", timeout=15).status_code == 200

    def test_auth_me_landlord(self, s, landlord_token):
        r = s.get(f"{API}/auth/me", headers=_h(landlord_token), timeout=10)
        assert r.status_code == 200
        assert r.json()["role"] == "landlord"

    def test_bookings_mine_ok(self, s, tenant_token):
        assert s.get(f"{API}/bookings/mine", headers=_h(tenant_token), timeout=10).status_code == 200

    def test_bookings_landlord_ok(self, s, landlord_token):
        assert s.get(f"{API}/bookings/landlord", headers=_h(landlord_token), timeout=10).status_code == 200
