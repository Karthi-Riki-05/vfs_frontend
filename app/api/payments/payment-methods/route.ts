import { createProxy } from "@/lib/proxy";
const { GET } = createProxy("/api/v1/payments/payment-methods", ["GET"]);
export { GET };
