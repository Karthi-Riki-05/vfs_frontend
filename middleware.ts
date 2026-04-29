import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const { pathname } = request.nextUrl;

  // For API routes: return 401 JSON instead of redirecting
  if (pathname.startsWith("/api/")) {
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // For page routes: redirect to login.
  // Behind a reverse proxy `request.url` resolves to the internal
  // origin (localhost:3000). Rebuild the public origin from the
  // forwarded headers so the callbackUrl points back to the real host.
  if (!token) {
    const fwdHost = request.headers.get("x-forwarded-host");
    const fwdProto = request.headers.get("x-forwarded-proto");
    const publicOrigin = fwdHost
      ? `${fwdProto || "https"}://${fwdHost}`
      : request.nextUrl.origin;

    const loginUrl = new URL("/login", publicOrigin);
    const callbackUrl = `${publicOrigin}${request.nextUrl.pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/upgrade-pro/:path*",
    "/admin/:path*",
    "/api/upgrade-pro/:path*",
    "/api/pro/:path*",
    "/api/flows/:path*",
    "/api/shapes/:path*",
    "/api/shape-groups/:path*",
    "/api/subscription/:path*",
    "/api/teams/:path*",
    "/api/chat/:path*",
    "/api/issues/:path*",
    "/api/payments/:path*",
    "/api/users/me",
    "/api/users/me/:path*",
    "/api/admin/:path*",
    "/api/invite/accept",
    "/api/openai/:path*",
    "/api/projects/:path*",
  ],
};
