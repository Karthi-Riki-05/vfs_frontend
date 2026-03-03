import { createProxy } from '@/lib/proxy';
const { GET, POST } = createProxy('/api/v1/teams/:id/members', ['GET', 'POST']);
export { GET, POST };
