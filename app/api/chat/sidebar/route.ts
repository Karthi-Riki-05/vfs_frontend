import { createProxy } from '@/lib/proxy';

const { GET } = createProxy('/api/v1/chat/sidebar', ['GET']);
export { GET };
