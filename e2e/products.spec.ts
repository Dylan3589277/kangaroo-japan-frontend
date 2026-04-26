import { test, expect } from '@playwright/test';

test.describe('Products page smoke tests', () => {
  test('商品列表页面能加载 /zh/products', async ({ page }) => {
    const response = await page.goto('/zh/products');
    expect(response?.status()).toBe(200);
    // Should have some content rendered
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('商品列表页面能加载 /en/products', async ({ page }) => {
    const response = await page.goto('/en/products');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('商品列表页面应有搜索输入框', async ({ page }) => {
    await page.goto('/zh/products');
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('单个商品详情页路由正常', async ({ page }) => {
    // Just navigate to a product detail page with a placeholder ID
    // This tests that the route exists, even if the product isn't found
    const response = await page.goto('/zh/products/test-product');
    // Should get a 200 or 404 response (non-500)
    expect(response?.status()).not.toBe(500);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
