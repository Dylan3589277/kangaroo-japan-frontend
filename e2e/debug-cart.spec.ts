import { test, expect } from '@playwright/test';

test('debug cart redirect', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push('PAGE ERROR: ' + err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text().substring(0, 200));
  });

  await page.goto('/en/cart');
  
  // Wait a bit longer
  await page.waitForTimeout(10000);
  
  console.log('Current URL:', page.url());
  console.log('Body text:', await page.locator('body').innerText());
  console.log('ERRORS:', JSON.stringify(errors));
});
