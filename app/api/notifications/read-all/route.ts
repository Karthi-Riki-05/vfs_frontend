import { createProxy } from "@/lib/proxy";
export const { PUT } = createProxy("/api/v1/notifications/read-all", ["PUT"]);
