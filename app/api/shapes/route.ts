import { createProxy } from "@/lib/proxy";

// Use the shared proxy so the workspace-scoping header (X-Workspace-Context) and
// query params (groupId/search) are forwarded to the backend. The old manual
// handler forwarded ONLY Authorization, so shapes were never team-scoped and
// showed in every account.
const { GET, POST } = createProxy("/api/shapes", ["GET", "POST"]);
export { GET, POST };
