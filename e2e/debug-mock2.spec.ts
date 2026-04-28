import { test, expect } from '@playwright/test';

test('debug mock interceptor 2', async ({ page }) => {
  // Collect console errors
  const errors: string[] = [];
  page.on('pageerror', err => {
    errors.push('PAGE ERROR: ' + err.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push('CONSOLE ERROR: ' + msg.text());
    }
  });

  // Also mock categories
  await page.route('**/api/v1/categories*', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { id: 'cat-1', name: 'Food and Drink', nameEn: 'Food and Drink', slug: 'food-drink' },
          { id: 'cat-2', name: 'Fashion', nameEn: 'Fashion', slug: 'fashion' },
        ],
      }),
    });
  });

  // Mock products API
  await page.route('**/api/v1/products**', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          data: [
            {
              id: 'prod-1',
              title: 'Japanese Matcha Green Tea Powder 100g',
              platform: 'amazon',
              platformName: 'Amazon',
              images: ['https://via.placeholder.com/300'],
              priceJpy: 2580,
              priceCny: 128.50,
              priceUsd: 18.00,
              currency: 'JPY',
              rating: 4.5,
              reviewCount: 128,
              salesCount: 560,
              inStock: true,
              status: 'active',
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
      }),
    });
  });

  await page.goto('/en/products');
  await page.waitForTimeout(5000);
  
  console.log('ERRORS:', JSON.stringify(errors));
  
  const bodyText = await page.locator('body').innerText();
  console.log('BODY TEXT:', bodyText.substring(0, 1000));
});
