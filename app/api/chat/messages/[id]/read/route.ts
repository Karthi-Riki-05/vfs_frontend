import { createProxy } from '@/lib/proxy';
const { PUT } = createProxy('/api/v1/chat/messages/:id/read', ['PUT']);
export { PUT };
