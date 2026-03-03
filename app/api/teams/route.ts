import { createProxy } from '@/lib/proxy';
const { GET, POST } = createProxy('/api/v1/teams', ['GET', 'POST']);
export { GET, POST };
