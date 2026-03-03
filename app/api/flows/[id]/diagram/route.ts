import { createProxy } from '@/lib/proxy';
const { PUT } = createProxy('/api/v1/flows/:id/diagram', ['PUT']);
export { PUT };
