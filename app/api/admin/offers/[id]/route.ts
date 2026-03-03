import { createProxy } from '@/lib/proxy';
const { PUT, DELETE } = createProxy('/api/v1/admin/offers/:id', ['PUT', 'DELETE']);
export { PUT, DELETE };
