import { Platform } from "react-native";
import { getToken } from "./token";

// ── Backend URL resolution ────────────────────────────────────────────────────
// CRITICAL: On native (Android/iOS) localhost NEVER works — it points to the
// device itself, not your computer. So we IGNORE any localhost value on native
// and always use the production URL.
const PROD_URL = "https://nestfinder-app-backend.onrender.com";

function resolveBase(): string {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;

  // No env var set → use production
  if (!envUrl) return PROD_URL;

  // On native, reject localhost/127.0.0.1 — it can never work on a real device
  const isLocalhost = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(envUrl);
  if (Platform.OS !== "web" && isLocalhost) {
    console.warn(`[api] Ignoring localhost URL "${envUrl}" on native — using ${PROD_URL}`);
    return PROD_URL;
  }

  return envUrl;
}

const BASE = resolveBase();

// Log once at startup so the URL is visible in logcat / browser console
console.log(`[api] Backend URL: ${BASE}`);

async function request(path: string, opts: RequestInit = {}) {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `${BASE}/api${path}`;

  let res: Response;
  try {
    res = await fetch(url, { ...opts, headers });
  } catch (e: any) {
    // Transport-level failure (DNS, connection refused, TLS, cleartext blocked)
    console.error(`[api] Network failure calling ${url}:`, e?.message);
    const err: any = new Error(
      `Cannot reach server. Please check your internet connection and try again.`
    );
    err.isNetworkError = true;
    err.url = url;
    throw err;
  }

  const text = await res.text();

  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Server returned HTML (e.g. Render cold-start 502 page)
      console.error(`[api] Non-JSON response from ${url}:`, text.slice(0, 200));
      const err: any = new Error(
        res.status >= 500
          ? "Server is starting up. Please wait a moment and try again."
          : `Unexpected server response (HTTP ${res.status})`
      );
      err.status = res.status;
      throw err;
    }
  }

  if (!res.ok) {
    const err: any = new Error(data.detail || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (p: string) => request(p),
  post: (p: string, body: any) => request(p, { method: "POST", body: JSON.stringify(body) }),
  patch: (p: string, body: any) => request(p, { method: "PATCH", body: JSON.stringify(body) }),
  del: (p: string) => request(p, { method: "DELETE" }),
};

export type User = {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  role: "tenant" | "landlord";
  avatar?: string;
  auth_provider?: string;
  kyc_status?: "none" | "pending" | "verified";
};

export type Property = {
  property_id: string;
  title: string;
  location: string;
  price: number;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  description: string;
  amenities: string[];
  images: string[];
  status: "available" | "rented" | "owned";
  landlord_id: string;
  landlord_name: string;
  landlord_verified?: boolean;
  lat?: number | null;
  lng?: number | null;
  created_at: string;
};

export type ChatThread = {
  thread_id: string;
  tenant_id: string;
  landlord_id: string;
  property_id: string;
  property_title: string;
  last_message: string;
  last_message_at: string;
  other_id?: string;
  other_name?: string;
  other_verified?: boolean;
};

export type ChatMessage = {
  message_id: string;
  thread_id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  created_at: string;
};

export type Review = {
  review_id: string;
  property_id: string;
  author_id: string;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

export type Booking = {
  booking_id: string;
  property_id: string;
  property_title: string;
  property_image?: string;
  landlord_id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_phone: string;
  move_in_date: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at: string;
};
