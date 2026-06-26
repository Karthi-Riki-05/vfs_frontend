import { createProxy } from "@/lib/proxy";
const { POST } = createProxy("/api/v1/notifications/broadcast", ["POST"]);
export { POST };
