import { createProxy } from "@/lib/proxy";

// Shared proxy forwards X-Team-Context + query params (the old manual handler
// forwarded only Authorization, so shape groups were never team-scoped).
const { GET, POST } = createProxy("/api/shape-groups", ["GET", "POST"]);
export { GET, POST };
