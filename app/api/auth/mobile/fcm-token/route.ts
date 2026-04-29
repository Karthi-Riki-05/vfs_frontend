import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import jwt from "jsonwebtoken";
import axios from "axios";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Not authenticated" },
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    const backendUrl = process.env.BACKEND_URL || "http://vc-backend:5000";
    const token = jwt.sign(
      { sub: userId, id: userId },
      process.env.NEXTAUTH_SECRET!,
      {
        expiresIn: "30s",
      },
    );

    const response = await axios.post(
      `${backendUrl}/api/v1/auth/mobile/fcm-token`,
      body,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    console.error(
      "fcm-token proxy error:",
      error.response?.data || error.message,
    );
    return NextResponse.json(
      error.response?.data || {
        success: false,
        error: { code: "PROXY_ERROR", message: "Failed to register FCM token" },
      },
      { status: error.response?.status || 500 },
    );
  }
}
