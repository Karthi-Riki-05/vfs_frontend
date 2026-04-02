import { createProxy } from '@/lib/proxy';

const handlers = createProxy('/api/projects', ['GET', 'POST']);
export const GET = handlers.GET;
export const POST = handlers.POST;
