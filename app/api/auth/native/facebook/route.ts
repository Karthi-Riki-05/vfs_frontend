import { NextResponse } from "next/server";
import axios from "axios";

/**
 * Exchange a native Facebook access token for a one-time login ticket.
 *
 * DELIBERATELY UNAUTHENTICATED, for the same reason as its Google and
 * biometric siblings: the shell calls this BEFORE any session exists, so
 * requiring one would make native Facebook sign-in impossible by construction.
 * The backend verifies the token with Facebook — including that it was minted
 * for OUR app — before issuing anything.
 *
 * It lives here rather than being called on the API host directly so the shell
 * only ever needs the one configured APP_URL origin (CLAUDE.md §1–§3).
 *
 * As with the others, there is no `consume` route beside this one and there
 * must never be — the ticket is redeemed server-to-server by the `biometric`
 * NextAuth provider. Exposing consume publicly would let anyone holding a
 * ticket mint a session outside NextAuth's flow.
 */
export async function POST(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://vc-backend:5000";
    const body = await request.json().catch(() => ({}));

    const response = await axios.post(
      `${backendUrl}/api/v1/auth/native/facebook`,
      body,
    );

    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    // Pass the backend's own shape through so the shell can distinguish the
    // cases it must explain to the user — notably SOCIAL_NO_EMAIL, where the
    // Facebook account simply has no address to sign in with.
    return NextResponse.json(
      error.response?.data || {
        success: false,
        error: {
          code: "PROXY_ERROR",
          message: "Facebook sign-in failed",
        },
      },
      { status: error.response?.status || 500 },
    );
  }
}
