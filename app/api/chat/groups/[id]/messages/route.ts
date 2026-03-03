import { createProxy } from '@/lib/proxy';
const { GET, POST } = createProxy('/api/v1/chat/groups/:id/messages', ['GET', 'POST']);
export { GET, POST };
