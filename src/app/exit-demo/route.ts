import { NextResponse, type NextRequest } from "next/server";
import { GUEST_COOKIE } from "@/app/demo/route";

// Leaves demo mode and sends the visitor to sign in / sign up.
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const to = searchParams.get("to") === "signup" ? "/signup" : "/login";
  const response = NextResponse.redirect(`${origin}${to}`);
  response.cookies.delete(GUEST_COOKIE);
  return response;
}
