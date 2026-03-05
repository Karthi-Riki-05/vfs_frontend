import { createProxy } from '@/lib/proxy';
const { GET } = createProxy('/api/v1/chat/unread-count', ['GET']);
export { GET };
