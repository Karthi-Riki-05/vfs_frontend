import { createProxy } from '@/lib/proxy';
const { GET } = createProxy('/api/v1/teams/workspace/members', ['GET']);
export { GET };
