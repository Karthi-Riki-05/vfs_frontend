import { createProxy } from "@/lib/proxy";
const { POST } = createProxy("/api/v1/payments/check-duplicate-card", ["POST"]);
export { POST };
