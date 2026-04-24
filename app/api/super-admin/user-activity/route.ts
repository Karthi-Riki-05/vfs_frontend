import { createProxy } from "@/lib/proxy";
const { GET } = createProxy("/api/v1/super-admin/user-activity", ["GET"]);
export { GET };
