import { createProxy } from "@/lib/proxy";
const { DELETE } = createProxy(
  "/api/v1/super-admin/settings/super-admins/:userId",
  ["DELETE"],
);
export { DELETE };
