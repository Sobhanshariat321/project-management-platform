// Typed API client with 401 refresh handling
// VITE_API_BASE defaults to "/api" (relative: same-origin in prod, Vite proxy in dev).
// When set to an absolute backend URL, all calls honor it (with credentials/cookies).
const RAW_BASE =
  (import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_API_BASE || "/api";
const API_BASE = RAW_BASE.endsWith("/") && RAW_BASE.length > 1 ? RAW_BASE.slice(0, -1) : RAW_BASE;
const IS_ABSOLUTE_BASE = /^https?:\/\//.test(API_BASE);

function resolveUrl(path: string): string {
  // Callers pass "/api/..." paths. Honor API_BASE consistently instead of
  // bypassing it for "/api" paths (the old bypass forced a relative URL that
  // only worked when the Vite dev proxy happened to hit the right backend).
  const hadApiPrefix = path.startsWith("/api");
  const suffix = hadApiPrefix ? path.slice(4) || "/" : path.startsWith("/") ? path : `/${path}`;
  if (IS_ABSOLUTE_BASE) {
    // Absolute backend URL (e.g. VITE_API_BASE=http://localhost:4001/api or
    // http://localhost:4001): anchor "/api/..." calls onto it without doubling.
    const base = API_BASE.endsWith("/api") ? API_BASE.slice(0, -4) : API_BASE;
    if (hadApiPrefix) return `${base}/api${suffix === "/" ? "" : suffix}`;
    return `${base}${suffix}`;
  }
  // Relative base (default "/api"): keep same-origin relative URL for proxy/prod.
  if (API_BASE === "/api") return `/api${suffix === "/" ? "" : suffix}`;
  return `${API_BASE}${suffix}`;
}

type ApiError = { error: { code: string; message: string; fields?: Record<string,string> } };

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

async function refreshToken(): Promise<boolean> {
  try {
    const r = await fetch(resolveUrl("/api/auth/refresh"), { method: "POST", credentials: "include" });
    return r.ok;
  } catch { return false; }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = resolveUrl(path);
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
  return resolveUrl(path);
}
