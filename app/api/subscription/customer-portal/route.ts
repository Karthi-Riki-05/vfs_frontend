import { createProxy } from "@/lib/proxy";
const { POST } = createProxy("/api/v1/subscription/customer-portal", ["POST"]);
export { POST };
