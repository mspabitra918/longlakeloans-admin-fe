// Backend API base URL — falls back to Next.js API routes (proxied) if not set
const API_BASE = "";

export function apiUrl(path: string): string {
  // If we have an absolute URL in env, use it (optional override)
  const base = process.env.NEXT_PUBLIC_API_URL_OVERRIDE || API_BASE;
  return `${base}${path}`;
}
