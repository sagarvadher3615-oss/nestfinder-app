# NestFinder — Product Requirements Document

## Vision
A mobile marketplace for monthly room and property rentals that connects tenants directly with landlords — no brokers, no commissions, no fake listings.

## Users
- **Tenants** — browse, search, filter, and book verified monthly rentals.
- **Landlords** — list properties (with photos), manage listings, review incoming booking requests.

## MVP Feature Set (v1 — shipped)

### Auth
- Email + Password (JWT, 30-day expiry) via `/api/auth/register` and `/api/auth/login`.
- Emergent-managed Google OAuth via `/api/auth/session` (7-day session token).
- `GET /api/auth/me`, `POST /api/auth/logout`, `PATCH /api/auth/role` for role switching.
- Token stored in `expo-secure-store` on mobile, `localStorage` on web.

### Property Marketplace
- 8 seed properties across Bangalore, Pune, Mumbai; 2 demo users (tenant + landlord).
- List with filters: `q` (title/location), `property_type`, `min_price`, `max_price`, `bedrooms`.
- Detail view: image gallery (swipeable), amenities grid, verified landlord card, sticky Book Now bar.
- Landlords can create (photo picker → base64), view mine, and delete their own listings.

### Bookings
- Tenant submits name / phone / move-in date → status `pending`.
- Landlord Accept / Decline; Tenant can Cancel.
- Separate views: `/api/bookings/mine` (tenant) and `/api/bookings/landlord` (landlord).

### Navigation
- Role-aware bottom tabs (Home/Listings · Search · Bookings/Requests · Profile).
- Onboarding → Register/Login → Tabs.

## Design System
- **Personality**: iOS-Native Clean.
- **Palette**: Sage Green brand `#5C715E` on off-white surface `#FAFAFA`. Zero blues/purples.
- **Typography**: Plus Jakarta Sans; weights capped at 500.
- **Radii**: sm 6 / md 12 / lg 20 / pill 999.
- **Spacing scale**: 4 / 8 / 12 / 16 / 24 / 32 / 48.
- **Chip rows**: fixed 36pt chip · 56pt row · horizontal-only scroll (never wrap).

## Tech Stack
- **Frontend**: Expo SDK 54 + expo-router file-based routing, expo-image, expo-image-picker, expo-secure-store, expo-web-browser, expo-linking, expo-linear-gradient.
- **Backend**: FastAPI + Motor (async MongoDB), bcrypt password hashing, PyJWT.
- **DB**: MongoDB collections: `users`, `user_sessions` (TTL on `expires_at`), `properties`, `bookings`.

## Demo Credentials
- Tenant — `tenant@nestfinder.app` / `Demo123!`
- Landlord — `landlord@nestfinder.app` / `Demo123!`

## Not in v1 (future)
- In-app chat between tenant and landlord.
- Payments / deposits (Stripe / Razorpay).
- Saved / Favourite properties.
- Maps view with pins.
- Reviews and ratings.
- Verified-landlord KYC upload.
