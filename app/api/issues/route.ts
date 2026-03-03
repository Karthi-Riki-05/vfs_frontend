import { createProxy } from '@/lib/proxy';
const { GET, POST } = createProxy('/api/v1/issues', ['GET', 'POST']);
export { GET, POST };
