import { createProxy } from '@/lib/proxy';
const { DELETE } = createProxy('/api/v1/flows/:id/permanent', ['DELETE']);
export { DELETE };
