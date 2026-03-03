import { createProxy } from '@/lib/proxy';
const { PUT } = createProxy('/api/v1/admin/plans/:id', ['PUT']);
export { PUT };
