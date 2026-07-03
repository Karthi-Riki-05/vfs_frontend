import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: 'check_billing.spec.ts',
  use: { baseURL: 'http://localhost:3002' },
});
