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

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const token = getToken(session);
    const response = await axios.get(
      `${BACKEND_URL}/api/v1/users/team-context`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      error.response?.data || { error: "Internal Server Error" },
      { status: error.response?.status || 500 },
    );
  }
}
