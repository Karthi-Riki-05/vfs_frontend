import { createProxy } from "@/lib/proxy";
const { PUT, DELETE } = createProxy("/api/v1/chat/messages/:id", [
  "PUT",
  "DELETE",
]);
export { PUT, DELETE };
