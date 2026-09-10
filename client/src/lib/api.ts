// Typed API client with 401 refresh handling
const API_BASE = (import.meta as unknown as { env: Record<string,string> }).env.VITE_API_BASE ?? "/api";

type ApiError = { error: { code: string; message: string; fields?: Record<string,string> } };

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

async function refreshToken(): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/auth/refresh`, { method: "POST", credentials: "include" });
    return r.ok;
  } catch { return false; }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("/api") ? path : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  // attach retry once on 401
  let res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (res.status === 401 && !path.includes("/auth/")) {
    // try refresh once (deduplicated across concurrent callers)
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshToken()
        .then(() => {
          isRefreshing = false;
        })
        .catch(() => {
          isRefreshing = false;
        });
    }
    if (refreshPromise) await refreshPromise;
    // retry original
    res = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      ...init,
    });
    if (res.status === 401) {
      // force logout event
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
  }
  if (!res.ok) {
    const body: ApiError = await res.json().catch(() => ({ error: { code: "UNKNOWN", message: `Request failed ${res.status}` } }));
    const err: unknown = new Error(body?.error?.message ?? `Request failed ${res.status}`);
    (err as unknown as Record<string,unknown>).code = body?.error?.code;
    (err as unknown as Record<string,unknown>).fields = body?.error?.fields;
    (err as unknown as Record<string,unknown>).status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function apiUrl(path: string) {
  return path.startsWith("/api") ? path : `${API_BASE}${path}`;
}
