import { createProxy } from '@/lib/proxy';
const { GET } = createProxy('/api/v1/teams/accept', ['GET']);
export { GET };
