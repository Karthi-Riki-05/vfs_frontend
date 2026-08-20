import { createProxy } from "@/lib/proxy";
const { GET } = createProxy(
  "/api/v1/super-admin/users/:userId/credit-workspaces",
  ["GET"],
);
export { GET };
