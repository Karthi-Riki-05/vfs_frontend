import { createProxy } from '@/lib/proxy';
const { GET } = createProxy('/api/v1/subscription/plans', ['GET']);
export { GET };
