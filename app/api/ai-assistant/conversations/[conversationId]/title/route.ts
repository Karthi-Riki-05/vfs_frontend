import { createProxy } from "@/lib/proxy";
export const { PUT } = createProxy(
  "/api/v1/ai-assistant/conversations/:conversationId/title",
  ["PUT"],
);
