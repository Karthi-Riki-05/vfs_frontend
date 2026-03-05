import { createProxy } from '@/lib/proxy';
const { GET } = createProxy('/api/v1/chat/files/:id/preview', ['GET']);
export { GET };
