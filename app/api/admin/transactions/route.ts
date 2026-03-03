import { createProxy } from '@/lib/proxy';
const { GET } = createProxy('/api/v1/admin/transactions', ['GET']);
export { GET };
