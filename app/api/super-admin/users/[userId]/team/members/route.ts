import { createProxy } from "@/lib/proxy";
const { POST } = createProxy("/api/v1/super-admin/users/:userId/team/members", [
  "POST",
]);
export { POST };
