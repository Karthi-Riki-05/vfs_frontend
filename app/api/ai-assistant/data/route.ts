import { createProxy } from '@/lib/proxy';
export const { DELETE } = createProxy('/api/v1/ai-assistant/data', ['DELETE']);
