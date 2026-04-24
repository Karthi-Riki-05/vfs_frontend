import { createProxy } from "@/lib/proxy";
const { DELETE } = createProxy(
  "/api/v1/super-admin/users/:userId/team/members/:memberId",
  ["DELETE"],
);
export { DELETE };
