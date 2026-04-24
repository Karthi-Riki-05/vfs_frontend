import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import jwt from "jsonwebtoken";

const BACKEND_URL = process.env.BACKEND_URL || "http://vc-backend:5000";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const token = jwt.sign(
      { id: (session.user as any).id, role: (session.user as any).role },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: "1h" },
    );

    const formData = await req.formData();
    const response = await axios.post(
      `${BACKEND_URL}/api/v1/ai-assistant/analyze-document`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      },
    );
    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      error.response?.data || { success: false, error: "Upload failed" },
      { status: error.response?.status || 500 },
    );
  }
}
