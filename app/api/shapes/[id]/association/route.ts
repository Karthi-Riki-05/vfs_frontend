import { createProxy } from "@/lib/proxy";

const { GET } = createProxy("/api/shapes/:id/association", ["GET"]);
export { GET };
