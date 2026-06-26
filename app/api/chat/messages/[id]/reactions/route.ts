import { createProxy } from "@/lib/proxy";
const { POST } = createProxy("/api/v1/chat/messages/:id/reactions", ["POST"]);
export { POST };
