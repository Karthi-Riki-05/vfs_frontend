import { createProxy } from "@/lib/proxy";

// AI diagram generation can take up to ~2 minutes (Gemini). Raise the route's
// max execution window so the platform gateway doesn't 504 before the backend
// responds, and force dynamic so it's never statically optimized/cached.
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export const { POST } = createProxy("/api/v1/ai/generate-diagram", ["POST"]);
