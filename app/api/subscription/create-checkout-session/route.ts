import { createProxy } from '@/lib/proxy';
const { POST } = createProxy('/api/v1/subscription/create-checkout-session', ['POST']);
export { POST };
