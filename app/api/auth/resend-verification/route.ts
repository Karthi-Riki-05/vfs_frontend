import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const backendUrl = process.env.BACKEND_URL || "http://vc-backend:5000";
    const response = await axios.post(
      `${backendUrl}/api/auth/resend-verification`,
      body,
    );
    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    console.error(
      "Resend verification proxy error:",
      error.response?.data || error.message,
    );
    return NextResponse.json(
      error.response?.data || {
        success: false,
        error: { code: "UNKNOWN", message: "Failed to resend code" },
      },
      { status: error.response?.status || 500 },
    );
  }
}
