import { createProxy } from '@/lib/proxy';
const { PUT } = createProxy('/api/v1/admin/feedback/:id', ['PUT']);
export { PUT };
