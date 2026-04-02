import { createProxy } from '@/lib/proxy';

const handlers = createProxy('/api/projects/:id', ['GET', 'PUT', 'DELETE']);
export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
