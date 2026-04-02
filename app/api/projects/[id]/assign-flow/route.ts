import { createProxy } from '@/lib/proxy';

const handlers = createProxy('/api/projects/:id/assign-flow', ['POST']);
export const POST = handlers.POST;
