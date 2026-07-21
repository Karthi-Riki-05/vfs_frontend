import { createProxy } from "@/lib/proxy";
const { POST } = createProxy("/api/v1/iap/validate", ["POST"]);
export { POST };
