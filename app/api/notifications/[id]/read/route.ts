import { createProxy } from "@/lib/proxy";
export const { PUT } = createProxy("/api/v1/notifications/:id/read", ["PUT"]);
