import { createProxy } from '@/lib/proxy';
const { GET } = createProxy('/api/v1/admin/subscriptions', ['GET']);
export { GET };
