import { createProxy } from '@/lib/proxy';
const { GET } = createProxy('/api/v1/chat/groups/:id/available-members', ['GET']);
export { GET };
