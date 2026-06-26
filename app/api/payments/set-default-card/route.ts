import { createProxy } from "@/lib/proxy";
const { POST } = createProxy("/api/v1/payments/set-default-card", ["POST"]);
export { POST };
