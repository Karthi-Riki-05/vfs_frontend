import { NextRequest, NextResponse } from "next/server";
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
      { id: (session as any).user.id },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: "1h" },
    );

    const incoming = await req.formData();
    const file = incoming.get("document");
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { success: false, error: { message: "No file uploaded" } },
        { status: 400 },
      );
    }

    // Re-build a fresh FormData (web standard) to forward to backend
    const fd = new FormData();
    fd.append("document", file as Blob, (file as File).name || "document");

    const backendRes = await fetch(`${BACKEND_URL}/api/flows/ai-from-doc`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    const data = await backendRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: { message: error?.message || "Internal Server Error" },
      },
      { status: 500 },
    );
  }
}
