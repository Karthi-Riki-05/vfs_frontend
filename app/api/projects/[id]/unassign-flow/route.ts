import { createProxy } from '@/lib/proxy';

const handlers = createProxy('/api/projects/:id/unassign-flow', ['POST']);
export const POST = handlers.POST;
