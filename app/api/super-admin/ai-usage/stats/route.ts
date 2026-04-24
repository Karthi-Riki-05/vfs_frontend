import { createProxy } from "@/lib/proxy";
const { GET } = createProxy("/api/v1/super-admin/ai-usage/stats", ["GET"]);
export { GET };
