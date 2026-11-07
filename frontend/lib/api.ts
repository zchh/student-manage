export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface User {
  id: number;
  role: "advisor" | "teacher";
  name: string;
}

export function currentUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  return raw ? (JSON.parse(raw) as User) : null;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  location.href = "/";
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "请求失败");
  return body as T;
}
