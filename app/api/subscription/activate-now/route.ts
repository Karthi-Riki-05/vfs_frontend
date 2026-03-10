import { createProxy } from '@/lib/proxy';
const { POST } = createProxy('/api/v1/subscription/activate-now', ['POST']);
export { POST };
