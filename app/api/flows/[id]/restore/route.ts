import { createProxy } from '@/lib/proxy';
const { POST } = createProxy('/api/v1/flows/:id/restore', ['POST']);
export { POST };
