import { createProxy } from '@/lib/proxy';
const { DELETE } = createProxy('/api/v1/chat/groups/:id/members/:userId', ['DELETE']);
export { DELETE };
