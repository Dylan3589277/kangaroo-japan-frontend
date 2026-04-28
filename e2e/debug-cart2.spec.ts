import { test, expect } from '@playwright/test';

test('debug cart localStorage', async ({ page }) => {
  // First, check localStorage on a fresh page
  await page.goto('/en');
  await page.waitForTimeout(2000);
  
  const ls = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    const data: Record<string, any> = {};
    for (const key of keys) {
      try {
        data[key] = JSON.parse(localStorage.getItem(key) || '{}');
      } catch {
        data[key] = localStorage.getItem(key);
      }
    }
    return data;
  });
  
  console.log('localStorage:', JSON.stringify(ls, null, 2));
  
  // Now go to cart
  await page.goto('/en/cart');
  await page.waitForTimeout(5000);
  
  console.log('After cart URL:', page.url());
  console.log('Body:', await page.locator('body').innerText());
});
