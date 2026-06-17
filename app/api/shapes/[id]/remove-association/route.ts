import { createProxy } from "@/lib/proxy";

const { DELETE } = createProxy("/api/shapes/:id/remove-association", [
  "DELETE",
]);
export { DELETE };
