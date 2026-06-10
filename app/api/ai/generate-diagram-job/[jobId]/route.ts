import { createProxy } from "@/lib/proxy";

// Polled by the client until the diagram job is done/error. Short, fast GET.
export const dynamic = "force-dynamic";

export const { GET } = createProxy("/api/v1/ai/generate-diagram-job/:jobId", [
  "GET",
]);
