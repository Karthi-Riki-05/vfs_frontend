import { createProxy } from '@/lib/proxy';
const { DELETE } = createProxy('/api/v1/teams/:id/members/:uid', ['DELETE']);
export { DELETE };
