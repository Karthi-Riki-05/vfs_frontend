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
    const {
      flowId,
      xml,
      thumbnail,
      name,
      createVersion = false,
    } = await req.json();

    if (!flowId || !xml) {
      return NextResponse.json(
        { error: "Missing flowId or xml" },
        { status: 400 },
      );
    }

    const token = jwt.sign(
      { id: (session as any).user.id },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: "1h" },
    );

    // Forward the workspace-scoping headers the browser's axios interceptor
    // set. Dropping them makes the backend fall back to the caller's
    // currentVersion (their strongest plan), not the app they are working in —
    // which resolves shares and workspace scope against the wrong context.
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    const workspaceCtx =
      req.headers.get("x-workspace-context") ||
      req.headers.get("x-team-context");
    if (workspaceCtx) headers["X-Workspace-Context"] = workspaceCtx;
    const appCtx = req.headers.get("x-app-context");
    if (appCtx) headers["X-App-Context"] = appCtx;

    // Use PUT to update the flow diagram data
    await axios.put(
      `${BACKEND_URL}/api/v1/flows/${flowId}`,
      {
        diagramData: xml,
        thumbnail: thumbnail,
        name: name,
        createVersion: createVersion, // FEAT-002: true on manual save, false on autosave
      },
      { headers },
    );

    return NextResponse.json({ message: "Diagram saved successfully" });
  } catch (error: any) {
    console.error("Autosave failed in frontend route:", error);
    return NextResponse.json(
      error.response?.data || { error: "Internal Server Error" },
      { status: error.response?.status || 500 },
    );
  }
}
