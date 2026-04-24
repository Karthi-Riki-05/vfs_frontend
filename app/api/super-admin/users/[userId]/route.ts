import { createProxy } from "@/lib/proxy";
const { GET, PUT, DELETE } = createProxy("/api/v1/super-admin/users/:userId", [
  "GET",
  "PUT",
  "DELETE",
]);
export { GET, PUT, DELETE };
