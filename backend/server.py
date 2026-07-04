import os
import uuid
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import httpx
import jwt
import bcrypt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, Field, EmailStr


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ.get("JWT_SECRET", "nestfinder-secret-change-me")
JWT_ALG = "HS256"
JWT_EXP_DAYS = 30

app = FastAPI(title="NestFinder API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nestfinder")


# =============== Models ===============
Role = Literal["tenant", "landlord"]
PropertyType = Literal["Single Room", "1BHK", "2BHK", "3BHK", "PG/Hostel"]
PropertyStatus = Literal["available", "rented", "owned"]
BookingStatus = Literal["pending", "accepted", "declined", "cancelled"]


class User(BaseModel):
    user_id: str
    name: str
    email: str
    phone: Optional[str] = None
    role: Role
    avatar: Optional[str] = None
    kyc_status: Literal["none", "pending", "verified"] = "none"
    auth_provider: str = "password"  # or "google"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    role: Role


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionIn(BaseModel):
    session_token: str
    role: Optional[Role] = "tenant"


class TokenOut(BaseModel):
    token: str
    user: User


class PropertyIn(BaseModel):
    title: str
    location: str
    price: float
    property_type: PropertyType
    bedrooms: int
    bathrooms: int = 1
    description: str = ""
    amenities: List[str] = []
    images: List[str] = []  # base64 strings or URLs
    status: PropertyStatus = "available"


class Property(PropertyIn):
    property_id: str
    landlord_id: str
    landlord_name: str
    landlord_verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BookingIn(BaseModel):
    property_id: str
    tenant_name: str
    tenant_phone: str
    move_in_date: str  # ISO date


class Booking(BaseModel):
    booking_id: str
    property_id: str
    property_title: str
    property_image: Optional[str] = None
    landlord_id: str
    tenant_id: str
    tenant_name: str
    tenant_phone: str
    move_in_date: str
    status: BookingStatus = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusPatch(BaseModel):
    status: BookingStatus


# =============== Auth utils ===============
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXP_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(request: Request) -> User:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth[7:]

    # try emergent session_token first
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if sess:
        exp = sess.get("expires_at")
        if exp and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp and exp < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        user_doc = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0, "password_hash": 0})
        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user_doc)

    # try JWT
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        uid = payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_doc = await db.users.find_one({"user_id": uid}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_doc)


# =============== Auth endpoints ===============
@api.post("/auth/register", response_model=TokenOut)
async def register(inp: RegisterIn):
    existing = await db.users.find_one({"email": inp.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "name": inp.name.strip(),
        "email": inp.email.lower(),
        "phone": inp.phone,
        "role": inp.role,
        "avatar": None,
        "auth_provider": "password",
        "password_hash": hash_pw(inp.password),
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user_doc)
    token = make_token(user_id)
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return TokenOut(token=token, user=User(**user_doc))


@api.post("/auth/login", response_model=TokenOut)
async def login(inp: LoginIn):
    doc = await db.users.find_one({"email": inp.email.lower()}, {"_id": 0})
    if not doc or not doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_pw(inp.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = make_token(doc["user_id"])
    doc.pop("password_hash", None)
    return TokenOut(token=token, user=User(**doc))


@api.post("/auth/session", response_model=TokenOut)
async def google_session(inp: GoogleSessionIn):
    # Verify with Emergent
    async with httpx.AsyncClient(timeout=15) as hc:
        r = await hc.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": inp.session_token},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Google auth failed")
    data = r.json()
    email = data.get("email", "").lower()
    if not email:
        raise HTTPException(status_code=401, detail="Missing email from Google")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "name": data.get("name") or email.split("@")[0],
            "email": email,
            "phone": None,
            "role": inp.role or "tenant",
            "avatar": data.get("picture"),
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc),
        })

    # store session
    await db.user_sessions.update_one(
        {"session_token": data["session_token"]},
        {"$set": {
            "session_token": data["session_token"],
            "user_id": user_id,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return TokenOut(token=data["session_token"], user=User(**doc))


@api.get("/auth/me", response_model=User)
async def me(user: User = Depends(get_current_user)):
    return user


@api.post("/auth/logout")
async def logout(request: Request):
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}


@api.patch("/auth/role")
async def update_role(body: dict, user: User = Depends(get_current_user)):
    role = body.get("role")
    if role not in ("tenant", "landlord"):
        raise HTTPException(status_code=400, detail="Invalid role")
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"role": role}})
    return {"ok": True, "role": role}


# =============== Property endpoints ===============
async def _enrich_verified(docs: list) -> list:
    if not docs:
        return docs
    landlord_ids = list({d["landlord_id"] for d in docs})
    verified_users = await db.users.find(
        {"user_id": {"$in": landlord_ids}, "kyc_status": "verified"},
        {"_id": 0, "user_id": 1},
    ).to_list(500)
    verified_set = {u["user_id"] for u in verified_users}
    for d in docs:
        d["landlord_verified"] = d["landlord_id"] in verified_set
    return docs


@api.get("/properties", response_model=List[Property])
async def list_properties(
    q: Optional[str] = None,
    property_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    bedrooms: Optional[int] = None,
    available_only: bool = False,
    sort: str = "newest",
    limit: int = Query(50, le=100),
):
    query = {}
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"location": {"$regex": q, "$options": "i"}},
        ]
    if property_type and property_type != "All":
        query["property_type"] = property_type
    if min_price is not None:
        query.setdefault("price", {})["$gte"] = min_price
    if max_price is not None:
        query.setdefault("price", {})["$lte"] = max_price
    if bedrooms is not None:
        query["bedrooms"] = bedrooms
    if available_only:
        query["status"] = "available"
    sort_map = {
        "newest": ("created_at", -1),
        "price_asc": ("price", 1),
        "price_desc": ("price", -1),
    }
    sort_field, sort_dir = sort_map.get(sort, ("created_at", -1))
    docs = await db.properties.find(query, {"_id": 0}).sort(sort_field, sort_dir).to_list(limit)
    docs = await _enrich_verified(docs)
    return [Property(**d) for d in docs]


@api.get("/properties/mine", response_model=List[Property])
async def my_properties(user: User = Depends(get_current_user)):
    docs = await db.properties.find({"landlord_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    docs = await _enrich_verified(docs)
    return [Property(**d) for d in docs]


@api.get("/properties/{pid}", response_model=Property)
async def get_property(pid: str):
    doc = await db.properties.find_one({"property_id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Property not found")
    docs = await _enrich_verified([doc])
    return Property(**docs[0])


@api.post("/properties", response_model=Property)
async def create_property(inp: PropertyIn, user: User = Depends(get_current_user)):
    if user.role != "landlord":
        raise HTTPException(status_code=403, detail="Only landlords can add properties")
    prop = Property(
        property_id=f"prop_{uuid.uuid4().hex[:12]}",
        landlord_id=user.user_id,
        landlord_name=user.name,
        **inp.dict(),
    )
    await db.properties.insert_one(prop.dict())
    return prop


@api.delete("/properties/{pid}")
async def delete_property(pid: str, user: User = Depends(get_current_user)):
    doc = await db.properties.find_one({"property_id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if doc["landlord_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not your property")
    await db.properties.delete_one({"property_id": pid})
    return {"ok": True}


@api.patch("/properties/{pid}/status", response_model=Property)
async def update_property_status(pid: str, body: dict, user: User = Depends(get_current_user)):
    status = body.get("status")
    if status not in ("available", "rented", "owned"):
        raise HTTPException(status_code=400, detail="Invalid status")
    doc = await db.properties.find_one({"property_id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if doc["landlord_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not your property")
    await db.properties.update_one({"property_id": pid}, {"$set": {"status": status}})
    doc["status"] = status
    return Property(**doc)


# =============== Booking endpoints ===============
@api.post("/bookings", response_model=Booking)
async def create_booking(inp: BookingIn, user: User = Depends(get_current_user)):
    prop = await db.properties.find_one({"property_id": inp.property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    if prop.get("status", "available") != "available":
        raise HTTPException(status_code=400, detail="This property is not available for booking")
    booking = Booking(
        booking_id=f"bk_{uuid.uuid4().hex[:12]}",
        property_id=inp.property_id,
        property_title=prop["title"],
        property_image=(prop.get("images") or [None])[0],
        landlord_id=prop["landlord_id"],
        tenant_id=user.user_id,
        tenant_name=inp.tenant_name,
        tenant_phone=inp.tenant_phone,
        move_in_date=inp.move_in_date,
    )
    await db.bookings.insert_one(booking.dict())
    return booking


@api.get("/bookings/mine", response_model=List[Booking])
async def my_bookings(user: User = Depends(get_current_user)):
    docs = await db.bookings.find({"tenant_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [Booking(**d) for d in docs]


@api.get("/bookings/landlord", response_model=List[Booking])
async def landlord_bookings(user: User = Depends(get_current_user)):
    docs = await db.bookings.find({"landlord_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [Booking(**d) for d in docs]


@api.patch("/bookings/{bid}", response_model=Booking)
async def update_booking(bid: str, patch: StatusPatch, user: User = Depends(get_current_user)):
    doc = await db.bookings.find_one({"booking_id": bid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if doc["landlord_id"] != user.user_id and doc["tenant_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    # Only the landlord can accept/decline; tenant can only cancel their own
    if patch.status in ("accepted", "declined") and doc["landlord_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only landlord can accept/decline")
    await db.bookings.update_one({"booking_id": bid}, {"$set": {"status": patch.status}})
    doc["status"] = patch.status

    # When landlord accepts: mark property as rented + auto-decline other pending requests
    if patch.status == "accepted":
        await db.properties.update_one(
            {"property_id": doc["property_id"]},
            {"$set": {"status": "rented"}},
        )
        await db.bookings.update_many(
            {
                "property_id": doc["property_id"],
                "booking_id": {"$ne": bid},
                "status": "pending",
            },
            {"$set": {"status": "declined"}},
        )
    return Booking(**doc)


# =============== Seed data ===============
SEED_IMAGES = {
    "1": "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=1200",
    "2": "https://images.pexels.com/photos/18153132/pexels-photo-18153132.jpeg?w=1200",
    "3": "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200",
    "4": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200",
    "5": "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200",
    "6": "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200",
    "7": "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200",
    "8": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200",
    "9": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200",
}


async def seed_data():
    users_count = await db.users.count_documents({})
    if users_count > 0:
        return

    # Demo landlord
    landlord_id = "user_demo_landlord"
    await db.users.insert_one({
        "user_id": landlord_id,
        "name": "Priya Sharma",
        "email": "landlord@nestfinder.app",
        "phone": "+919876543210",
        "role": "landlord",
        "avatar": "https://images.pexels.com/photos/10816007/pexels-photo-10816007.jpeg?w=400",
        "auth_provider": "password",
        "password_hash": hash_pw("Demo123!"),
        "created_at": datetime.now(timezone.utc),
    })
    # Demo tenant
    tenant_id = "user_demo_tenant"
    await db.users.insert_one({
        "user_id": tenant_id,
        "name": "Rahul Mehta",
        "email": "tenant@nestfinder.app",
        "phone": "+919876500000",
        "role": "tenant",
        "avatar": None,
        "auth_provider": "password",
        "password_hash": hash_pw("Demo123!"),
        "created_at": datetime.now(timezone.utc),
    })

    seed_props = [
        ("Sunny 1BHK near Metro", "Koramangala, Bangalore", 18000, "1BHK", 1, 1,
         "Bright and airy 1BHK apartment just 5 mins walk from the metro station. Fully furnished with modern amenities.",
         ["WiFi", "AC", "Kitchen", "Parking"], [SEED_IMAGES["1"], SEED_IMAGES["3"]]),
        ("Modern 2BHK with Balcony", "HSR Layout, Bangalore", 32000, "2BHK", 2, 2,
         "Spacious 2BHK with balcony views, perfect for small families or working professionals.",
         ["WiFi", "AC", "Balcony", "Gym", "Parking"], [SEED_IMAGES["2"], SEED_IMAGES["4"]]),
        ("Cozy Single Room", "Indiranagar, Bangalore", 9500, "Single Room", 1, 1,
         "Compact fully furnished room ideal for students or bachelors. Includes power backup.",
         ["WiFi", "Furnished", "Power Backup"], [SEED_IMAGES["5"]]),
        ("Premium 3BHK Family Home", "Whitefield, Bangalore", 55000, "3BHK", 3, 3,
         "Luxurious 3BHK in a gated community with clubhouse, swimming pool, and 24/7 security.",
         ["WiFi", "AC", "Swimming Pool", "Gym", "Security", "Parking"], [SEED_IMAGES["6"], SEED_IMAGES["9"]]),
        ("Girls PG - Fully Furnished", "BTM Layout, Bangalore", 8500, "PG/Hostel", 1, 1,
         "Safe and comfortable PG for working women with meals, WiFi, and 24/7 security.",
         ["WiFi", "Meals", "Laundry", "Security"], [SEED_IMAGES["7"]]),
        ("Bright 1BHK Studio", "MG Road, Pune", 15500, "1BHK", 1, 1,
         "Modern studio-style 1BHK in the heart of Pune. Walk to cafes, offices, and metro.",
         ["WiFi", "AC", "Kitchen"], [SEED_IMAGES["8"]]),
        ("Spacious 2BHK", "Andheri West, Mumbai", 42000, "2BHK", 2, 2,
         "Well-ventilated 2BHK apartment with easy access to the metro and local shops.",
         ["WiFi", "AC", "Parking", "Lift"], [SEED_IMAGES["3"], SEED_IMAGES["2"]]),
        ("Boys PG Near Tech Park", "Marathahalli, Bangalore", 7500, "PG/Hostel", 1, 1,
         "Budget-friendly PG for working professionals. Meals included, near IT parks.",
         ["WiFi", "Meals", "Laundry"], [SEED_IMAGES["4"]]),
    ]

    for (title, location, price, ptype, beds, baths, desc, amens, imgs) in seed_props:
        await db.properties.insert_one({
            "property_id": f"prop_{uuid.uuid4().hex[:12]}",
            "title": title,
            "location": location,
            "price": price,
            "property_type": ptype,
            "bedrooms": beds,
            "bathrooms": baths,
            "description": desc,
            "amenities": amens,
            "images": imgs,
            "landlord_id": landlord_id,
            "landlord_name": "Priya Sharma",
            "created_at": datetime.now(timezone.utc),
        })

    logger.info("Seed data inserted: 2 users, 8 properties")


@app.on_event("startup")
async def on_startup():
    # indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.properties.create_index("property_id", unique=True)
    await db.bookings.create_index("booking_id", unique=True)
    # Migration: ensure all properties have a status field
    await db.properties.update_many({"status": {"$exists": False}}, {"$set": {"status": "available"}})
    await seed_data()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


@api.get("/")
async def root():
    return {"service": "NestFinder API", "ok": True}


# =============== Favourites ===============
@api.get("/favorites")
async def list_favorites(user: User = Depends(get_current_user)):
    docs = await db.favorites.find({"user_id": user.user_id}, {"_id": 0}).to_list(500)
    pids = [d["property_id"] for d in docs]
    if not pids:
        return {"ids": [], "properties": []}
    props = await db.properties.find({"property_id": {"$in": pids}}, {"_id": 0}).to_list(500)
    return {"ids": pids, "properties": [Property(**p).dict() for p in props]}


@api.post("/favorites/{pid}")
async def toggle_favorite(pid: str, user: User = Depends(get_current_user)):
    existing = await db.favorites.find_one({"user_id": user.user_id, "property_id": pid})
    if existing:
        await db.favorites.delete_one({"user_id": user.user_id, "property_id": pid})
        return {"favorited": False}
    await db.favorites.insert_one({
        "user_id": user.user_id,
        "property_id": pid,
        "created_at": datetime.now(timezone.utc),
    })
    return {"favorited": True}


# =============== Reviews ===============
class ReviewIn(BaseModel):
    property_id: str
    rating: int  # 1..5
    comment: str = ""


class Review(BaseModel):
    review_id: str
    property_id: str
    author_id: str
    author_name: str
    rating: int
    comment: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


@api.get("/reviews/{pid}")
async def list_reviews(pid: str):
    docs = await db.reviews.find({"property_id": pid}, {"_id": 0}).sort("created_at", -1).to_list(200)
    reviews = [Review(**d).dict() for d in docs]
    if not reviews:
        return {"average": 0.0, "count": 0, "reviews": []}
    avg = round(sum(r["rating"] for r in reviews) / len(reviews), 1)
    return {"average": avg, "count": len(reviews), "reviews": reviews}


@api.post("/reviews", response_model=Review)
async def create_review(inp: ReviewIn, user: User = Depends(get_current_user)):
    if not (1 <= inp.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    prop = await db.properties.find_one({"property_id": inp.property_id}, {"_id": 0})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    # one review per user per property
    existing = await db.reviews.find_one({"property_id": inp.property_id, "author_id": user.user_id})
    if existing:
        raise HTTPException(status_code=400, detail="You've already reviewed this property")
    review = Review(
        review_id=f"rev_{uuid.uuid4().hex[:12]}",
        property_id=inp.property_id,
        author_id=user.user_id,
        author_name=user.name,
        rating=inp.rating,
        comment=inp.comment.strip(),
    )
    await db.reviews.insert_one(review.dict())
    return review


# =============== KYC (verification) ===============
async def _auto_approve_kyc(user_id: str):
    await asyncio.sleep(5)
    await db.users.update_one({"user_id": user_id}, {"$set": {"kyc_status": "verified"}})


@api.post("/kyc/submit")
async def submit_kyc(body: dict, user: User = Depends(get_current_user)):
    # body: {"document": "base64..."} — we don't actually store the doc, just mark pending
    if not body.get("document"):
        raise HTTPException(status_code=400, detail="Document is required")
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"kyc_status": "pending"}})
    # auto-approve after 5s (demo)
    asyncio.create_task(_auto_approve_kyc(user.user_id))
    return {"status": "pending"}


@api.get("/kyc/status")
async def kyc_status(user: User = Depends(get_current_user)):
    doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "kyc_status": 1})
    return {"status": doc.get("kyc_status", "none") if doc else "none"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
