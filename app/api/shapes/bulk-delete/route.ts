import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import jwt from "jsonwebtoken";

const BACKEND_URL = process.env.BACKEND_URL || "http://vc-backend:5000";

function getToken(session: any) {
  return jwt.sign(
    { id: session.user.id, role: session.user.role },
    process.env.NEXTAUTH_SECRET!,
    { expiresIn: "1h" },
  );
}

// Custom handler (not createProxy): the backend expects DELETE with a JSON
// body ({ shapeIds }) and the shared proxy drops bodies on DELETE.
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const token = getToken(session);
    let body = {};
    try {
      body = await req.json();
    } catch {}
    const response = await axios.delete(
      `${BACKEND_URL}/api/shapes/bulk-delete`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: body,
      },
    );
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      error.response?.data || { error: "Internal Server Error" },
      { status: error.response?.status || 500 },
    );
  }
}
