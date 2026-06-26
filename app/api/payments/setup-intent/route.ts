import { createProxy } from "@/lib/proxy";
const { POST } = createProxy("/api/v1/payments/setup-intent", ["POST"]);
export { POST };
