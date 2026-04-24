import { createProxy } from "@/lib/proxy";
const { POST, DELETE } = createProxy(
  "/api/v1/super-admin/users/:userId/subscription",
  ["POST", "DELETE"],
);
export { POST, DELETE };
