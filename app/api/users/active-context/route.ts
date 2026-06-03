import { createProxy } from "@/lib/proxy";

// Persisted AI-billing team context (WebView-safe). Billing only — never a
// data scope. See backend user.controller setActiveContext/getActiveContext.
export const { GET, POST } = createProxy("/api/v1/users/active-context", [
  "GET",
  "POST",
]);
