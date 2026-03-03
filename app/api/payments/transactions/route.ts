import { createProxy } from '@/lib/proxy';
const { GET } = createProxy('/api/v1/payments/transactions', ['GET']);
export { GET };
