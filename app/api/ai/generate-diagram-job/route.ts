import { createProxy } from "@/lib/proxy";

// Starts an async diagram-generation job and returns a jobId immediately, so
// the request never stays open long enough to hit a gateway 504. force-dynamic
// so it is never statically optimized/cached.
export const dynamic = "force-dynamic";

export const { POST } = createProxy("/api/v1/ai/generate-diagram-job", [
  "POST",
]);
