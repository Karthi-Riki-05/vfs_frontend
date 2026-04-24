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

function errorResponse(error: any) {
  return NextResponse.json(
    error.response?.data || { error: "Internal Server Error" },
    { status: error.response?.status || 500 },
  );
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Creates Next.js API route handlers that proxy to the Express backend.
 * @param backendPath - e.g. '/api/v1/teams' (can include :param placeholders)
 * @param methods - which HTTP methods to support
 */
export function createProxy(
  backendPath: string,
  methods: Method[] = ["GET", "POST", "PUT", "DELETE"],
) {
  const handlers: Record<string, any> = {};

  for (const method of methods) {
    handlers[method] = async (
      req: NextRequest,
      context?: { params: Record<string, string> },
    ) => {
      const session = await getServerSession(authOptions);
      if (!session)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      try {
        const token = getToken(session);
        const params = context?.params || {};

        // Replace :param placeholders with actual values
        let resolvedPath = backendPath;
        for (const [key, value] of Object.entries(params)) {
          resolvedPath = resolvedPath.replace(`:${key}`, value);
        }

        const url = `${BACKEND_URL}${resolvedPath}`;
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
        };
        // Forward the workspace-scoping header set by the browser's axios
        // request interceptor (lib/axios.tsx). Backend controllers read it
        // as `req.headers['x-team-context']` to scope flows/chat/etc.
        const teamCtx = req.headers.get("x-team-context");
        if (teamCtx) headers["X-Team-Context"] = teamCtx;
        const { searchParams } = new URL(req.url);

        let response;
        if (method === "GET" || method === "DELETE") {
          response = await axios({
            method: method.toLowerCase(),
            url,
            headers,
            params: Object.fromEntries(searchParams),
          });
        } else {
          let body;
          try {
            body = await req.json();
          } catch {
            body = {};
          }
          response = await axios({
            method: method.toLowerCase(),
            url,
            headers,
            data: body,
            params: Object.fromEntries(searchParams),
          });
        }

        return NextResponse.json(response.data, { status: response.status });
      } catch (error: any) {
        return errorResponse(error);
      }
    };
  }

  return handlers;
}
