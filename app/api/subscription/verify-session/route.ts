import { createProxy } from '@/lib/proxy';
const { POST } = createProxy('/api/v1/subscription/verify-session', ['POST']);
export { POST };
