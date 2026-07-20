import { createProxy } from "@/lib/proxy";
// Shared proxy forwards X-Team-Context so members inside a paid tenant
// inherit the tenant owner's entitlements (Inherited Subscription Power).
const { GET } = createProxy("/api/v1/entitlements", ["GET"]);
export { GET };
