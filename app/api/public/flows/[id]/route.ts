import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const BACKEND_URL = process.env.BACKEND_URL || "http://vc-backend:5000";

// Deliberately unauthenticated — no getServerSession check. Mirrors
// backend/src/routes/public.routes.js, which only returns flows the owner
// explicitly flagged isPublic=true. Never add auth or write methods here;
// that's what /api/flows/[id] is for.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const response = await axios.get(
      `${BACKEND_URL}/api/v1/public/flows/${params.id}`,
    );
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      error.response?.data || { error: "Internal Server Error" },
      { status: error.response?.status || 500 },
    );
  }
}
