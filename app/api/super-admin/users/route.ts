import { createProxy } from "@/lib/proxy";
const { GET, POST } = createProxy("/api/v1/super-admin/users", ["GET", "POST"]);
export { GET, POST };
