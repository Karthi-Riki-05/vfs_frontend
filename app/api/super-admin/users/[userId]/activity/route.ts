import { createProxy } from "@/lib/proxy";
const { GET } = createProxy("/api/v1/super-admin/users/:userId/activity", [
  "GET",
]);
export { GET };
