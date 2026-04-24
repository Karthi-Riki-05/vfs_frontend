import { createProxy } from "@/lib/proxy";
const { PUT } = createProxy("/api/v1/super-admin/users/:userId/ai-credits", [
  "PUT",
]);
export { PUT };
