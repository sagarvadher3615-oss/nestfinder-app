import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";
import { useAuth } from "./auth";

type FavState = {
  ids: Set<string>;
  toggle: (pid: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  ready: boolean;
};

const Ctx = createContext<FavState>({} as any);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setIds(new Set()); setReady(true); return; }
    try {
      const res = await api.get("/favorites");
      setIds(new Set(res.ids || []));
    } catch { /* ignore */ }
    finally { setReady(true); }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = useCallback(async (pid: string) => {
    // optimistic
    const wasFav = ids.has(pid);
    setIds(prev => {
      const n = new Set(prev);
      wasFav ? n.delete(pid) : n.add(pid);
      return n;
    });
    try {
      const res = await api.post(`/favorites/${pid}`, {});
      return res.favorited;
    } catch {
      // revert
      setIds(prev => {
        const n = new Set(prev);
        wasFav ? n.add(pid) : n.delete(pid);
        return n;
      });
      throw new Error("Could not update favourite");
    }
  }, [ids]);

  return <Ctx.Provider value={{ ids, toggle, refresh, ready }}>{children}</Ctx.Provider>;
}

export const useFavorites = () => useContext(Ctx);
