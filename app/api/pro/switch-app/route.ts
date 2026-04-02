import { createProxy } from '@/lib/proxy';
export const { PUT } = createProxy('/api/v1/pro/switch-app', ['PUT']);
