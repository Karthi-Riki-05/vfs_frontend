import { createProxy } from '@/lib/proxy';
const { GET } = createProxy('/api/v1/flows/:id/shares', ['GET']);
export { GET };
