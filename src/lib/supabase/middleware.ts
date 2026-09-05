import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/demo",
  "/exit-demo",
  "/_next",
  "/favicon",
];

const GUEST_COOKIE = "finflow-guest";

/**
 * Refreshes the Supabase auth session on every request and, when Supabase is
 * configured, redirects unauthenticated users to /login (and authenticated
 * users away from the auth pages).
 *
 * When Supabase env vars are absent the app runs in local-only mode and this
 * is a no-op.
 */
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const response = NextResponse.next({ request });

  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
  const isGuest = request.cookies.get(GUEST_COOKIE)?.value === "1";

  // A signed-in visitor doesn't need the guest cookie hanging around.
  if (user && isGuest) response.cookies.delete(GUEST_COOKIE);

  // Unauthenticated + not already a guest → drop straight into the demo rather
  // than a login wall (portfolio-friendly). Set the cookie and continue on the
  // same request — no redirect hop. /login is still reachable directly.
  if (!user && !isGuest && !isPublic) {
    request.cookies.set(GUEST_COOKIE, "1"); // visible to this request's RSC render
    const withGuest = NextResponse.next({ request });
    response.cookies.getAll().forEach((c) => withGuest.cookies.set(c)); // keep refreshed auth cookies
    withGuest.cookies.set(GUEST_COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    return withGuest;
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/dashboard";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return response;
}
