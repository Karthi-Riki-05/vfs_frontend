import { createProxy } from "@/lib/proxy";
const { DELETE } = createProxy("/api/v1/payments/remove-card", ["DELETE"]);
export { DELETE };
