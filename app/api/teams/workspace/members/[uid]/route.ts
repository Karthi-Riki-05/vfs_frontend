import { createProxy } from '@/lib/proxy';
const { DELETE } = createProxy('/api/v1/teams/workspace/members/:uid', [
  'DELETE',
]);
export { DELETE };
