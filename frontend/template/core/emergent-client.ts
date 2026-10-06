// Supabase-compatible shim backed by the Emergent FastAPI backend.
// The original OnSpace code calls `getSupabaseClient()`; this keeps that API
// surface while routing auth, subscription and account calls to /api.
import { api, loadToken, setToken } from "@/src/api";
import { trackAppsFlyerEvent } from "@/src/services/appsflyerService";

type Listener = (event: string, session: any) => void;
const listeners = new Set<Listener>();
let cachedUser: any = null;

async function session() {
  const token = await loadToken();
  if (!token) return null;
  if (!cachedUser) {
    try {
      cachedUser = await api("/auth/me");
    } catch {
      await setToken(null);
      return null;
    }
  }
  return { access_token: token, user: toUser(cachedUser) };
}

export function toUser(u: any) {
  if (!u) return null;
  return { id: u.id, email: u.email, user_metadata: { username: u.name }, created_at: u.created_at, ...u };
}

export async function setSession(token: string | null, user: any) {
  await setToken(token);
  cachedUser = user;
  const s = token ? { access_token: token, user: toUser(user) } : null;
  listeners.forEach((l) => l(token ? "SIGNED_IN" : "SIGNED_OUT", s));
}

const ok = (data: any = null) => ({ data, error: null });
const fail = (message: string) => ({ data: null, error: { message } });

// Chainable no-op query builder (cloud sync tables are not used; data stays on device).
function queryBuilder(): any {
  const result = Promise.resolve(ok([]));
  const proxy: any = new Proxy(function () {}, {
    get: (_t, prop) => {
      if (prop === "then") return result.then.bind(result);
      if (prop === "catch") return result.catch.bind(result);
      if (prop === "single" || prop === "maybeSingle") return () => Promise.resolve(ok(null));
      return () => proxy;
    },
    apply: () => proxy,
  });
  return proxy;
}

const client = {
  auth: {
    getSession: async () => ok({ session: await session() }),
    getUser: async () => ok({ user: (await session())?.user ?? null }),
    onAuthStateChange: (cb: Listener) => {
      listeners.add(cb);
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    },
    signInWithOtp: async ({ email, options }: { email: string; options?: { shouldCreateUser?: boolean } }) => {
      try {
        await api("/auth/otp/send", { method: "POST", body: { email, should_create_user: options?.shouldCreateUser ?? true } });
        return ok({});
      } catch (e: any) {
        return fail(e.message);
      }
    },
    verifyOtp: async ({ email, token }: { email: string; token: string }) => {
      try {
        const r: any = await api("/auth/otp/verify", { method: "POST", body: { email, code: token } });
        await setSession(r.access_token, r.user);
        // Analytics: first-time OTP verify = registration, otherwise login.
        // Fire-and-forget — analytics must never break auth.
        if (r.is_new) trackAppsFlyerEvent("af_complete_registration", { af_registration_method: "otp" });
        else trackAppsFlyerEvent("af_login", { af_login_method: "otp" });
        return ok({ user: toUser(r.user), session: { access_token: r.access_token, user: toUser(r.user) } });
      } catch (e: any) {
        return fail(e.message);
      }
    },
    signOut: async () => {
      await setSession(null, null);
      return { error: null };
    },
  },
  functions: {
    invoke: async (name: string) => {
      try {
        if (name === "check-subscription") return ok(await api("/subscription"));
        if (name === "delete-account") return ok(await api("/account", { method: "DELETE" }));
        return fail(`${name} is not available`);
      } catch (e: any) {
        return fail(e.message);
      }
    },
  },
  from: () => queryBuilder(),
  storage: {
    from: () => ({
      upload: async () => fail("Cloud photo storage is not available"),
      remove: async () => ok([]),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
};

export const getSharedSupabaseClient = () => client as any;
export const getSupabaseClient = getSharedSupabaseClient;
export const safeSupabaseOperation = async <T,>(op: (c: any) => Promise<T>) => op(client);
