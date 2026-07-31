import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import jwt from "jsonwebtoken";
import axios from "axios";
import { authOptions } from "@/lib/auth";

const UNAUTHORIZED = NextResponse.json(
  {
    success: false,
    error: { code: "UNAUTHORIZED", message: "Not authenticated" },
  },
  { status: 401 },
);

/** Session → short-lived backend JWT, or null when unauthenticated. */
async function backendAuth() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return null;
  return {
    url: process.env.BACKEND_URL || "http://vc-backend:5000",
    token: jwt.sign({ sub: userId, id: userId }, process.env.NEXTAUTH_SECRET!, {
      expiresIn: "30s",
    }),
  };
}

function proxyError(error: any, message: string) {
  console.error("fcm-token proxy error:", error.response?.data || error.message);
  return NextResponse.json(
    error.response?.data || {
      success: false,
      error: { code: "PROXY_ERROR", message },
    },
    { status: error.response?.status || 500 },
  );
}

export async function POST(request: Request) {
  try {
    const auth = await backendAuth();
    if (!auth) return UNAUTHORIZED;

    const body = await request.json();
    const response = await axios.post(
      `${auth.url}/api/v1/auth/mobile/fcm-token`,
      body,
      { headers: { Authorization: `Bearer ${auth.token}` } },
    );

    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    return proxyError(error, "Failed to register FCM token");
  }
}

/**
 * De-register one device on logout.
 *
 * This handler was MISSING while `lib/logout.ts` → `unregisterNotificationToken()`
 * had been calling `api.delete("/auth/mobile/fcm-token")` all along: the route
 * exported only POST, so every logout de-registration answered 405 and the
 * device row survived. A logged-out browser therefore kept receiving pushes
 * until the token went stale on its own.
 *
 * The body carries `{ fcmToken }` and must be forwarded — the backend now
 * rejects an unscoped delete (`FCM_TOKEN_REQUIRED`) rather than clearing every
 * device for the user, so dropping the body here would break the call rather
 * than widen it. An empty/absent body is passed through as `{}` so that
 * rejection comes from the backend, in one place.
 */
export async function DELETE(request: Request) {
  try {
    const auth = await backendAuth();
    if (!auth) return UNAUTHORIZED;

    const body = await request.json().catch(() => ({}));
    const response = await axios.delete(
      `${auth.url}/api/v1/auth/mobile/fcm-token`,
      { headers: { Authorization: `Bearer ${auth.token}` }, data: body },
    );

    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    return proxyError(error, "Failed to unregister FCM token");
  }
}
