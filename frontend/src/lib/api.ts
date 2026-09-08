const BASE = import.meta.env.VITE_API_URL ?? "/api";

export type Post = {
  id: number;
  author: string;
  content: string;
  timestamp: number;
  tips: string;
};

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const fetchPosts = (offset = 0, limit = 20) =>
  request<{ posts: Post[]; total: number }>(`/posts?offset=${offset}&limit=${limit}`);

export const fetchHealth = () =>
  request<{ ok: boolean; contract: { address: string; network: string } | null }>("/health");
