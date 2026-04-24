import { createProxy } from "@/lib/proxy";
const { GET } = createProxy("/api/v1/super-admin/dashboard/stats", ["GET"]);
export { GET };
