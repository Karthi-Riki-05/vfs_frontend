import { createProxy } from "@/lib/proxy";

const { POST } = createProxy("/api/shapes/check-associations", ["POST"]);
export { POST };
