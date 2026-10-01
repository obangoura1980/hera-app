import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api } from "@/src/api";
import { getSupabaseClient, setSession } from "../core/emergent-client";
import type { AuthContextType, AuthUser } from "./types";

const Ctx = createContext<AuthContextType | null>(null);

const toAuthUser = (u: any): AuthUser | null => (u ? { id: u.id, email: u.email, username: u.name ?? u.user_metadata?.username, created_at: u.created_at } : null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);

  useEffect(() => {
    const sb = getSupabaseClient();
    sb.auth.getSession().then(({ data }: any) => {
      setUser(toAuthUser(data.session?.user));
      setLoading(false);
      setInitialized(true);
    });
    const { data } = sb.auth.onAuthStateChange((_e: string, s: any) => setUser(toAuthUser(s?.user)));
    return () => data.subscription.unsubscribe();
  }, []);

  const sendOTP = useCallback(async (email: string) => {
    setOperationLoading(true);
    const { error } = await getSupabaseClient().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setOperationLoading(false);
    return error ? { error: error.message, errorType: "business" as const } : {};
  }, []);

  const verifyOTPAndLogin = useCallback(async (email: string, otp: string) => {
    setOperationLoading(true);
    const { data, error } = await getSupabaseClient().auth.verifyOtp({ email, token: otp, type: "email" });
    setOperationLoading(false);
    if (error) return { error: error.message, errorType: "business" as const };
    return { user: toAuthUser(data.user) };
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string, metadata?: Record<string, any>) => {
    try {
      const r: any = await api("/auth/register", { method: "POST", body: { email, password, name: metadata?.username ?? email.split("@")[0] } });
      await setSession(r.access_token, r.user);
      return { user: toAuthUser(r.user) };
    } catch (e: any) {
      return { error: e.message, errorType: "business" as const };
    }
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    try {
      const r: any = await api("/auth/login", { method: "POST", body: { email, password } });
      await setSession(r.access_token, r.user);
      return { user: toAuthUser(r.user) };
    } catch (e: any) {
      return { error: e.message, errorType: "business" as const };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => ({ error: "Google sign-in is not available. Please use your email." }), []);

  const logout = useCallback(async () => {
    await setSession(null, null);
    return {};
  }, []);

  const refreshSession = useCallback(async () => {
    const { data } = await getSupabaseClient().auth.getSession();
    setUser(toAuthUser(data.session?.user));
  }, []);

  return (
    <Ctx.Provider
      value={{ user, loading, operationLoading, initialized, setOperationLoading, sendOTP, verifyOTPAndLogin, signUpWithPassword, signInWithPassword, signInWithGoogle, logout, refreshSession }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
