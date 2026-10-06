import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api, ApiError, loadToken, setToken, type User } from "@/src/api";
import { queryClient } from "@/src/query-client";
import { trackAppsFlyerEvent } from "@/src/services/appsflyerService";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const t = await loadToken();
      if (t) {
        try {
          setUser(await api<User>("/auth/me"));
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) await setToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const handleAuth = useCallback(async (res: { access_token: string; user: User }) => {
    await setToken(res.access_token);
    queryClient.clear();
    setUser(res.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api("/auth/login", { method: "POST", body: { email, password } });
      await handleAuth(res);
      // Analytics — successful sign-in only, fire-and-forget
      trackAppsFlyerEvent("af_login", { af_login_method: "password" });
    },
    [handleAuth],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) =>
      handleAuth(await api("/auth/register", { method: "POST", body: { name, email, password } })),
    [handleAuth],
  );

  const logout = useCallback(async () => {
    await setToken(null);
    queryClient.clear();
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, login, register, logout, setUser }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
