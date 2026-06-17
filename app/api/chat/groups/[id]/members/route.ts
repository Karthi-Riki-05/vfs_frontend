import { createProxy } from "@/lib/proxy";

const { POST } = createProxy("/api/v1/chat/groups/:id/members", ["POST"]);
export { POST };
