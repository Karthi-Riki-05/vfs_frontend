import { createProxy } from "@/lib/proxy";
export const { GET } = createProxy(
  "/api/v1/ai-assistant/conversations/:conversationId/messages",
  ["GET"],
);
