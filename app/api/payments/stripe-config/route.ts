import { createProxy } from "@/lib/proxy";
const { GET } = createProxy("/api/v1/payments/stripe-config", ["GET"]);
export { GET };
