import { createProxy } from "@/lib/proxy";
export const { POST } = createProxy("/api/v1/flows/resolve-lock", ["POST"]);
