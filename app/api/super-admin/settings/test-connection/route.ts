import { createProxy } from "@/lib/proxy";
const { GET } = createProxy("/api/v1/super-admin/settings/test-connection", [
  "GET",
]);
export { GET };
