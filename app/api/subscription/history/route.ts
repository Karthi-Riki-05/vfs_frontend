import { createProxy } from "@/lib/proxy";
const { GET } = createProxy("/api/v1/subscription/history", ["GET"]);
export { GET };
