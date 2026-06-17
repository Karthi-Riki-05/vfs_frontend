import { createProxy } from "@/lib/proxy";
export const { POST } = createProxy("/api/v1/pro/flow-addon/cancel", ["POST"]);
