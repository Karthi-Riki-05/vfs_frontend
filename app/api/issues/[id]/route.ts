import { createProxy } from '@/lib/proxy';
const { GET, PUT, DELETE } = createProxy('/api/v1/issues/:id', ['GET', 'PUT', 'DELETE']);
export { GET, PUT, DELETE };
