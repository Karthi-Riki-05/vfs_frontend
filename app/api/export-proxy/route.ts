import { NextRequest, NextResponse } from "next/server";

// Proxies form-encoded export requests from the draw.io iframe to the
// jgraph/export-server container. Only active when the `export` Compose
// profile is enabled — otherwise returns 503 and over-ride.js's
// browser-print fallback handles PDF.
const EXPORT_SERVER_URL =
  process.env.EXPORT_SERVER_URL || "http://drawio-export:8000/";

export async function POST(req: NextRequest) {
  try {
    const body = await req.arrayBuffer();
    const upstream = await fetch(EXPORT_SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type":
          req.headers.get("content-type") ||
          "application/x-www-form-urlencoded",
      },
      body: Buffer.from(body),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Export server returned ${upstream.status}` },
        { status: 502 },
      );
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") || "application/octet-stream",
        "Content-Disposition":
          upstream.headers.get("content-disposition") || "attachment",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          "Export server unreachable. Start it with: " +
          "docker compose --profile export up -d drawio-export",
      },
      { status: 503 },
    );
  }
}
