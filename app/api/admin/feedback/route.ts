import { createProxy } from '@/lib/proxy';
const { GET } = createProxy('/api/v1/admin/feedback', ['GET']);
export { GET };
