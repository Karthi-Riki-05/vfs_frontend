import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import jwt from "jsonwebtoken";

const BACKEND_URL = process.env.BACKEND_URL || "http://vc-backend:5000";

// CSV export needs to forward text/csv + Content-Disposition headers
// back to the browser, so we can't use the generic JSON proxy.
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = jwt.sign(
    {
      id: (session.user as any).id,
      role: (session.user as any).role,
    },
    process.env.NEXTAUTH_SECRET!,
    { expiresIn: "1h" },
  );

  try {
    const response = await axios.get(
      `${BACKEND_URL}/api/v1/super-admin/users/export/csv`,
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "text",
      },
    );

    return new NextResponse(response.data, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          response.headers["content-disposition"] ||
          `attachment; filename="valuechart-users.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      error.response?.data || { error: "Export failed" },
      { status: error.response?.status || 500 },
    );
  }
}
