import { createProxy } from '@/lib/proxy';
const { GET, PUT } = createProxy('/api/v1/users/:id', ['GET', 'PUT']);
export { GET, PUT };
