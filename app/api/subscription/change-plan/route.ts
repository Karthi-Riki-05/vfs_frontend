import { createProxy } from '@/lib/proxy';
const { POST } = createProxy('/api/v1/subscription/change-plan', ['POST']);
export { POST };
