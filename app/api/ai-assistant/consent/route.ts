import { createProxy } from '@/lib/proxy';
export const { GET, POST } = createProxy('/api/v1/ai-assistant/consent', ['GET', 'POST']);
