import { NextResponse, type NextRequest } from "next/server";

export const GUEST_COOKIE = "finflow-guest";

// Enters demo mode: the app runs on seeded local data, no account required.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") || "/dashboard";
  const dest = next.startsWith("/") && next !== "/" ? next : "/dashboard";

  const response = NextResponse.redirect(`${origin}${dest}`);
  response.cookies.set(GUEST_COOKIE, "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}
