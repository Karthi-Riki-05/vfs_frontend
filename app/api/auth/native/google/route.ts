import { NextResponse } from "next/server";
import axios from "axios";

/**
 * Exchange a native Google ID token for a one-time login ticket.
 *
 * DELIBERATELY UNAUTHENTICATED, for the same reason as the biometric
 * `exchange` route beside it: the shell calls this BEFORE any session exists,
 * so requiring one would make native Google sign-in impossible by
 * construction. The Google-signed ID token is the credential, and the backend
 * verifies its signature and audience before issuing anything.
 *
 * It lives here rather than being called directly on the API host so the shell
 * only ever needs the one configured APP_URL origin (CLAUDE.md §1–§3).
 *
 * As with biometric, there is no `consume` route beside this one and there must
 * never be — the ticket is redeemed server-to-server by the `biometric`
 * NextAuth provider. Exposing consume publicly would let anyone holding a
 * ticket mint a session outside NextAuth's flow.
 */
export async function POST(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://vc-backend:5000";
    const body = await request.json().catch(() => ({}));

    const response = await axios.post(
      `${backendUrl}/api/v1/auth/native/google`,
      body,
    );

    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    // Pass the backend's own shape through so the shell can tell a refused
    // account (ACCOUNT_INACTIVE / USER_DEACTIVATED) from a transient failure
    // it should let the user retry.
    return NextResponse.json(
      error.response?.data || {
        success: false,
        error: {
          code: "PROXY_ERROR",
          message: "Google sign-in failed",
        },
      },
      { status: error.response?.status || 500 },
    );
  }
}
