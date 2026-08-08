import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import jwt from "jsonwebtoken";

const BACKEND_URL = process.env.BACKEND_URL || "http://vc-backend:5000";

function buildHeaders(session: any, req: NextRequest) {
  const token = jwt.sign(
    { id: session.user.id },
    process.env.NEXTAUTH_SECRET!,
    { expiresIn: "1h" },
  );
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const teamCtx =
    req.headers.get("x-workspace-context") ||
    req.headers.get("x-team-context");
  if (teamCtx) headers["X-Workspace-Context"] = teamCtx;
  const appCtx = req.headers.get("x-app-context");
  if (appCtx) headers["X-App-Context"] = appCtx;
  return headers;
}

const NO_CACHE = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Vary: "X-App-Context, X-Workspace-Context",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const response = await axios.get(`${BACKEND_URL}/api/flows`, {
      params: Object.fromEntries(searchParams),
      headers: buildHeaders(session, req),
    });
    return NextResponse.json(response.data, { headers: NO_CACHE });
  } catch (error: any) {
    return NextResponse.json(
      error.response?.data || { error: "Internal Server Error" },
      { status: error.response?.status || 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const response = await axios.post(`${BACKEND_URL}/api/flows`, body, {
      headers: buildHeaders(session, req),
    });
    return NextResponse.json(response.data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      error.response?.data || { error: "Internal Server Error" },
      { status: error.response?.status || 500 },
    );
  }
}
