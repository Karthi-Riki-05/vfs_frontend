import { createProxy } from '@/lib/proxy';
const { PUT, DELETE } = createProxy('/api/v1/flows/:id/shares/:shareId', ['PUT', 'DELETE']);
export { PUT, DELETE };
