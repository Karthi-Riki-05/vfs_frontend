import { createProxy } from '@/lib/proxy';
const { GET } = createProxy('/api/v1/flows/trash', ['GET']);
export { GET };
