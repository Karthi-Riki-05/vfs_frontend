import { createProxy } from '@/lib/proxy';
const { PUT } = createProxy('/api/v1/chat/groups/:id/read', ['PUT']);
export { PUT };
