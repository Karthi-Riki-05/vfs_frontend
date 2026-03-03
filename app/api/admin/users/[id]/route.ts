import { createProxy } from '@/lib/proxy';
const { PUT } = createProxy('/api/v1/admin/users/:id', ['PUT']);
export { PUT };
