import { createProxy } from "@/lib/proxy";
const { POST } = createProxy("/api/v1/super-admin/notifications/broadcast", [
  "POST",
]);
export { POST };
