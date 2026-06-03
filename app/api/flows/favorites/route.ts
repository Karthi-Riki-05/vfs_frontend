import { createProxy } from "@/lib/proxy";

// Shared proxy forwards X-Team-Context + query params (the old manual handler
// forwarded only Authorization).
const { GET } = createProxy("/api/flows/favorites", ["GET"]);
export { GET };
