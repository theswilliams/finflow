/**
 * Returns a same-origin path (with query) that is safe to redirect to, or `fallback`.
 *
 * Building a redirect as `${origin}${next}` from user input is unsafe: `next = "@evil.com"`
 * produces `https://app.example@evil.com` (userinfo trick) and `next = ".evil.com"` produces a
 * sibling domain. So we only accept a rooted path, reject protocol-relative and backslash forms,
 * and confirm the resolved URL is still on our origin.
 */
export function safeNextPath(next: string | null | undefined, origin: string, fallback = "/dashboard"): string {
  if (!next || next.length > 500) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
   
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  try {
    const resolved = new URL(next, origin);
    if (resolved.origin !== new URL(origin).origin) return fallback;
    const path = resolved.pathname + resolved.search;
    return path === "/" ? fallback : path;
  } catch {
    return fallback;
  }
}
