import { createProxy } from '@/lib/proxy';
const { GET } = createProxy('/api/v1/flows/share/members', ['GET']);
export { GET };
