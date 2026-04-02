import { createProxy } from '@/lib/proxy';
export const { GET } = createProxy('/api/v1/upgrade-pro/verify-purchase', ['GET']);
