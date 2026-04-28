import { test, expect } from '@playwright/test';
import { MOCK_PRODUCTS_PAGE_RESPONSE, MOCK_CATEGORIES } from './mock-data';

test('debug with original mock data', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => {
    errors.push('PAGE ERROR: ' + err.message);
  });

  await page.route('**/api/v1/categories*', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_CATEGORIES }),
    });
  });

  await page.route('**/api/v1/products**', (route) => {
    const url = route.request().url();
    if (url.includes('/search')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { data: [], pagination: null } }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_PRODUCTS_PAGE_RESPONSE }),
    });
  });

  await page.goto('/en/products');
  await page.waitForTimeout(5000);
  
  console.log('ERRORS:', JSON.stringify(errors));
  
  const bodyText = await page.locator('body').innerText();
  console.log('BODY TEXT:', bodyText.substring(0, 1000));
});
