import { NextResponse } from "next/server";
import axios from "axios";

/**
 * Exchange a device token for a one-time login ticket.
 *
 * DELIBERATELY UNAUTHENTICATED — unlike every sibling route here, this one
 * cannot use `createProxy`. It is called by the native shell BEFORE any session
 * exists; requiring one would make biometric login impossible by construction.
 *
 * That is safe because possession of the device token IS the credential: it
 * lives in hardware-backed storage the OS only unlocks on a fingerprint / Face
 * ID match, the backend rotates it on every use, and replaying a superseded
 * copy revokes the device outright.
 *
 * Note there is no `consume` route beside this one, and there must never be.
 * The ticket is redeemed server-to-server by the `biometric` NextAuth provider,
 * which calls the backend directly; exposing consume publicly would let anyone
 * holding a ticket mint a session outside NextAuth's flow.
 */
export async function POST(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://vc-backend:5000";
    const body = await request.json().catch(() => ({}));

    const response = await axios.post(
      `${backendUrl}/api/v1/auth/biometric/exchange`,
      body,
    );

    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    // Pass the backend's own shape through so the shell can distinguish
    // "re-enrol needed" (DEVICE_REVOKED / DEVICE_EXPIRED) from a transient
    // failure it should simply retry.
    return NextResponse.json(
      error.response?.data || {
        success: false,
        error: { code: "PROXY_ERROR", message: "Biometric exchange failed" },
      },
      { status: error.response?.status || 500 },
    );
  }
}
