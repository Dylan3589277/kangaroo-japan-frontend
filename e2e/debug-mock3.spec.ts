import { test, expect } from '@playwright/test';

test('debug mock with real images', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => {
    errors.push('PAGE ERROR: ' + err.message);
  });

  await page.route('**/api/v1/categories*', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          { id: 'cat-1', name: 'Food and Drink', nameEn: 'Food and Drink', slug: 'food-drink' },
        ],
      }),
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
      body: JSON.stringify({
        success: true,
        data: {
          data: [
            {
              id: 'prod-1',
              title: 'Japanese Matcha Green Tea Powder 100g',
              platform: 'amazon',
              platformName: 'Amazon',
              images: [],
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
            {
              id: 'prod-2',
              title: 'Vintage Kimono Silk Fabric',
              platform: 'mercari',
              platformName: 'Mercari',
              images: [],
              priceJpy: 4500,
              priceCny: 224.00,
              priceUsd: 31.50,
              currency: 'JPY',
              rating: 4.8,
              reviewCount: 45,
              salesCount: 120,
              inStock: true,
              status: 'active',
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
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
  
  console.log('ERRORS:', JSON.stringify(errors));
  
  const bodyText = await page.locator('body').innerText();
  console.log('BODY TEXT:', bodyText.substring(0, 500));
  
  const matchaText = page.locator('text=Matcha');
  const count = await matchaText.count();
  console.log('Matcha text count:', count);
});
