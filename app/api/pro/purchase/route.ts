import { createProxy } from '@/lib/proxy';
export const { POST } = createProxy('/api/v1/pro/purchase', ['POST']);
