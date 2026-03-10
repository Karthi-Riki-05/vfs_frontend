import { createProxy } from '@/lib/proxy';
const { PUT, DELETE } = createProxy('/api/v1/chat/groups/:id', ['PUT', 'DELETE']);
export { PUT, DELETE };
