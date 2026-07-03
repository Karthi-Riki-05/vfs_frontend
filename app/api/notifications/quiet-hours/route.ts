import { createProxy } from "@/lib/proxy";
export const { GET, PUT } = createProxy("/api/v1/notifications/quiet-hours", [
  "GET",
  "PUT",
]);
