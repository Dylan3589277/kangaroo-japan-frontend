import { test, expect } from '@playwright/test';

test('debug mock interceptor', async ({ page }) => {
  // Listen to all requests
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log('REQUEST:', request.method(), request.url());
    }
  });

  // Mock products API
  await page.route('**/api/v1/products**', (route) => {
    console.log('INTERCEPTED:', route.request().url());
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
  await page.waitForTimeout(3000);
  
  const matchaText = page.locator('text=Matcha');
  const count = await matchaText.count();
  console.log('Matcha text count:', count);
  
  // Print body text
  const bodyText = await page.locator('body').innerText();
  console.log('BODY TEXT:', bodyText.substring(0, 500));
});
