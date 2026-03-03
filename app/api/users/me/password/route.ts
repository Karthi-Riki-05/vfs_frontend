import { createProxy } from '@/lib/proxy';
const { PUT } = createProxy('/api/v1/users/change-password', ['PUT']);
export { PUT };
