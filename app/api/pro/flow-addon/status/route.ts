import { createProxy } from "@/lib/proxy";
export const { GET } = createProxy("/api/v1/pro/flow-addon/status", ["GET"]);
