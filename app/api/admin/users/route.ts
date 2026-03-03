import { createProxy } from '@/lib/proxy';
const { GET } = createProxy('/api/v1/admin/users', ['GET']);
export { GET };
