import { createProxy } from '@/lib/proxy';
export const { POST } = createProxy('/api/v1/ai-assistant/generate-diagram', ['POST']);
