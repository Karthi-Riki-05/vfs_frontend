import { createProxy } from '@/lib/proxy';
const { POST } = createProxy('/api/v1/teams/invite', ['POST']);
export { POST };
