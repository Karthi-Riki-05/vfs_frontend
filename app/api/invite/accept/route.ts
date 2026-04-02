import { createProxy } from '@/lib/proxy';
const { POST } = createProxy('/api/v1/invite/accept', ['POST']);
export { POST };
