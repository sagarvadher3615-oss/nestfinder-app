import { getToken } from "./token";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function request(path: string, opts: RequestInit = {}) {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${path}`, { ...opts, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
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
