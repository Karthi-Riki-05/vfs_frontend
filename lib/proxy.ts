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
        // Forward workspace-scoping headers set by the browser's axios interceptor.
        // Read the legacy name too: a browser tab loaded before this deploy
        // still sends X-Team-Context, and dropping it would silently reset that
        // tab to the personal workspace.
        const teamCtx =
          req.headers.get("x-workspace-context") ||
          req.headers.get("x-team-context");
        if (teamCtx) headers["X-Workspace-Context"] = teamCtx;
        const appCtx = req.headers.get("x-app-context");
        if (appCtx) headers["X-App-Context"] = appCtx;
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

        return NextResponse.json(response.data, {
          status: response.status,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            Vary: "X-App-Context, X-Workspace-Context",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
      } catch (error: any) {
        return errorResponse(error);
      }
    };
  }

  return handlers;
}

/**
 * Proxies a STORE-TO-SERVER callback (Apple App Store Server Notifications V2,
 * Google Play RTDN via Pub/Sub push) to the Express backend.
 *
 * Separate from createProxy() because that one requires a NextAuth session and
 * 401s without one — Apple and Google obviously have no session, so routing
 * these through it made every callback unreachable. The backend is not exposed
 * publicly (port 5000 is closed), so this proxy is the ONLY path a store has to
 * reach us: without it renewals, cancellations, refunds and billing-retry
 * events never arrive and a subscription silently lapses at our end while the
 * store keeps charging.
 *
 * Being session-less is safe here because each callback carries its OWN
 * authenticity proof, checked by the backend and never by this layer:
 *   - Apple  → JWS signature chain verified against the pinned Apple root CA
 *   - Google → constant-time compare of the `?token=` RTDN shared secret
 * This layer therefore authenticates nothing on purpose; it only forwards.
 *
 * The body is forwarded as RAW TEXT rather than parsed JSON so nothing can be
 * re-encoded on the way through, and the query string is preserved because
 * Google's shared token travels in it.
 */
export function createStoreCallbackProxy(backendPath: string) {
  return async function POST(req: NextRequest) {
    try {
      const body = await req.text();
      const { search } = new URL(req.url);
      const response = await fetch(`${BACKEND_URL}${backendPath}${search}`, {
        method: "POST",
        headers: {
          "Content-Type": req.headers.get("content-type") || "application/json",
        },
        body,
        cache: "no-store",
      });
      // Mirror the backend's status verbatim: both stores retry on a non-2xx,
      // which is the delivery guarantee we want to keep intact.
      const text = await response.text();
      return new NextResponse(text || null, {
        status: response.status,
        headers: { "Cache-Control": "no-store" },
      });
    } catch (error: any) {
      // A 5xx makes the store retry later — the right outcome when our own
      // backend is unreachable, so never swallow this into a 200.
      console.error(
        `[store-callback] proxy to ${backendPath} failed:`,
        error?.message,
      );
      return NextResponse.json(
        { error: "Bad Gateway" },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
  };
}
