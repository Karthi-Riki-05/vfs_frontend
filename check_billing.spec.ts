import { test } from '@playwright/test';

test('screenshot billing and subscription in PRO context', async ({ page }) => {
  await page.goto('http://localhost:3002/login');
  await page.fill('input[type="email"]', 'valuestream@gmail.com');
  await page.fill('input[type="password"]', 'test1234');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 20000 });

  // Switch to PRO context
  await page.click('text=PRO');
  await page.waitForTimeout(2000);

  // Billing page
  await page.goto('http://localhost:3002/dashboard/settings/billing');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/billing_pro.png', fullPage: true });

  // Subscription page
  await page.goto('http://localhost:3002/dashboard/subscription');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/subscription_pro.png', fullPage: true });
});
