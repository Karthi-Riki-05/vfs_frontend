import { createProxy } from '@/lib/proxy';
const { POST } = createProxy('/api/v1/flows/:id/share', ['POST']);
export { POST };
