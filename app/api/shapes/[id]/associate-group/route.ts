import { createProxy } from "@/lib/proxy";

const { POST } = createProxy("/api/shapes/:id/associate-group", ["POST"]);
export { POST };
