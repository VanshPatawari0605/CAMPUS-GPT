import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { api, setUnauthorizedHandler, tokenStore } from "../lib/api";
import { translate } from "../lib/i18n";
import type { Lang, User } from "../lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, admin?: boolean) => Promise<User>;
  register: (data: Record<string, unknown>) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
  t: (key: string) => string;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (tokenStore.get()) toast.error("Your session has expired. Please log in again.");
      clearSession();
    });
    if (!tokenStore.get()) return;
    api
      .get("/auth/me")
      .then((r) => setUser(r.data.user))
      .catch(clearSession)
      .finally(() => setLoading(false));
  }, [clearSession]);

  const login = async (email: string, password: string, admin = false) => {
    const r = await api.post(admin ? "/auth/admin/login" : "/auth/login", { email, password });
    tokenStore.set(r.data.token);
    setUser(r.data.user);
    return r.data.user as User;
  };

  const register = async (data: Record<string, unknown>) => {
    const r = await api.post("/auth/register", data);
    tokenStore.set(r.data.token);
    setUser(r.data.user);
    return r.data.user as User;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout"); // revokes the token server-side
    } catch {
      /* token may already be invalid */
    }
    clearSession();
  };

  const lang: Lang = user?.preferredLanguage ?? "en";
  const value = useMemo<AuthState>(
    () => ({ user, loading, login, register, logout, setUser, t: (k) => translate(lang, k) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading, lang]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
