import { createProxy } from '@/lib/proxy';
const { GET, POST } = createProxy('/api/v1/admin/offers', ['GET', 'POST']);
export { GET, POST };
