import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { api, User } from "./api";
import { getToken, saveToken, clearToken } from "./token";

type AuthState = {
  user: User | null;
  loading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role: "tenant" | "landlord"; phone?: string }) => Promise<void>;
  loginWithGoogle: (role?: "tenant" | "landlord") => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthState>({} as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) { setUser(null); return; }
      const me = await api.get("/auth/me");
      setUser(me);
    } catch {
      await clearToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      // Web: check session_id in url
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const hash = window.location.hash || "";
        const search = window.location.search || "";
        const match = (hash + search).match(/session_id=([^&]+)/);
        if (match) {
          try {
            const res = await api.post("/auth/session", { session_token: match[1] });
            await saveToken(res.token);
            setUser(res.user);
            window.history.replaceState(null, "", window.location.pathname);
            setLoading(false);
            return;
          } catch (e) { console.warn("session process failed", e); }
        }
      }
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const loginWithPassword = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    await saveToken(res.token);
    setUser(res.user);
  };

  const register = async (data: any) => {
    const res = await api.post("/auth/register", data);
    await saveToken(res.token);
    setUser(res.user);
  };

  const loginWithGoogle = async (role: "tenant" | "landlord" = "tenant") => {
    const redirectUrl = Platform.OS === "web"
      ? window.location.origin + "/"
      : Linking.createURL("auth");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

    if (Platform.OS === "web") {
      window.location.href = authUrl;
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    if (result.type !== "success" || !result.url) return;
    const m = result.url.match(/session_id=([^&]+)/);
    if (!m) return;
    const res = await api.post("/auth/session", { session_token: m[1], role });
    await saveToken(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    try { await api.post("/auth/logout", {}); } catch {}
    await clearToken();
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, loginWithPassword, register, loginWithGoogle, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
