import { Platform } from "react-native";
import { fetch as expoFetch } from "expo/fetch";

import { storage } from "@/src/utils/storage";

export const API = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;
const TOKEN_KEY = "hera_token";
let token: string | null = null;

export async function loadToken() {
  token = await storage.secureGet<string | null>(TOKEN_KEY, null);
  return token;
}

export async function setToken(t: string | null) {
  token = t;
  if (t) await storage.secureSet(TOKEN_KEY, t);
  else await storage.secureRemove(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function errorMessage(body: any, status: number) {
  const d = body?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d[0]?.msg) return String(d[0].msg).replace("Value error, ", "");
  return `Something went wrong (${status})`;
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, errorMessage(body, res.status));
  return body as T;
}

export async function uploadImage(uri: string, name: string, type: string): Promise<string> {
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, name);
  } else {
    form.append("file", { uri, name, type } as any);
  }
  const res = await fetch(`${API}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, errorMessage(body, res.status));
  return body.path as string;
}

export function fileSource(path: string) {
  return {
    uri: `${API}/files/${path}?token=${encodeURIComponent(token ?? "")}`,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}

export async function streamCoach(text: string, onDelta: (t: string) => void): Promise<void> {
  const res = await expoFetch(`${API}/coach/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok || !res.body) throw new ApiError(res.status, "Hera couldn't reply right now");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const evt = JSON.parse(line.slice(5).trim());
      if (evt.delta) onDelta(evt.delta);
      if (evt.error) throw new ApiError(500, evt.error);
      if (evt.done) return;
    }
  }
}

export type User = { id: string; email: string; name: string; is_premium: boolean; created_at: string };
export type Stats = {
  streak: number;
  journal_count: number;
  goals_count: number;
  goals_achieved: number;
  sessions_done: number;
  affirmed_today: boolean;
};
export type JournalEntry = {
  id: string;
  kind: "gratitude" | "intention" | "reflection" | "win";
  title: string;
  content: string;
  mood: number;
  created_at: string;
};
export type Goal = {
  id: string;
  title: string;
  category: string;
  image_path: string | null;
  image_url: string | null;
  achieved: boolean;
  created_at: string;
};
export type Session = {
  id: string;
  title: string;
  subtitle: string;
  minutes: number;
  category: string;
  image: string;
  steps: string[];
};
export type DiscoverItem = {
  id: string;
  type: "article" | "quote";
  kind?: string;
  category: string;
  title: string;
  subtitle: string;
  read_minutes: number;
  image: string | null;
  body: string[];
};
export type ChatMsg = { id: string; role: "user" | "assistant"; text: string; created_at?: string };
export type Favorite = { id: string; text: string };
