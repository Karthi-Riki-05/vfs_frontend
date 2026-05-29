import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import jwt from "jsonwebtoken";

const BACKEND_URL = process.env.BACKEND_URL || "http://vc-backend:5000";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = jwt.sign(
      { id: (session.user as any).id, role: (session.user as any).role },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: "1h" },
    );

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    // Forward the Flutter-injected header so the backend mobileAppOnly guard
    // recognises this as a legitimate mobile-app request.
    const appSource = req.headers.get("x-app-source");
    if (appSource) headers["X-App-Source"] = appSource;

    // Also forward the UA so the backend UA-based WebView check works.
    const ua = req.headers.get("user-agent");
    if (ua) headers["User-Agent"] = ua;

    const response = await axios.post(
      `${BACKEND_URL}/api/v1/pro/grant-from-mobile`,
      {},
      { headers },
    );

    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      error.response?.data || { error: "Internal Server Error" },
      { status: error.response?.status || 500 },
    );
  }
}
