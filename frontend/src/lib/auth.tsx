import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, User } from "./api";
import { getToken, saveToken, clearToken } from "./token";

type AuthState = {
  user: User | null;
  loading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role: "tenant" | "landlord"; phone?: string }) => Promise<void>;
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

  const logout = async () => {
    try { await api.post("/auth/logout", {}); } catch {}
    await clearToken();
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, loginWithPassword, register, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
