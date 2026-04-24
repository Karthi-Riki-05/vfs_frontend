import { createProxy } from "@/lib/proxy";
const { POST } = createProxy(
  "/api/v1/super-admin/users/:userId/subscription/expire",
  ["POST"],
);
export { POST };
