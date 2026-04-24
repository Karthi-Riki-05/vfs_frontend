import { createProxy } from "@/lib/proxy";
const { POST } = createProxy("/api/v1/super-admin/settings/super-admins", [
  "POST",
]);
export { POST };
