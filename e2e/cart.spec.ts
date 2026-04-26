import { test, expect } from '@playwright/test';

test.describe('Cart page smoke tests', () => {
  test('购物车页面能加载 /zh/cart', async ({ page }) => {
    const response = await page.goto('/zh/cart');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('购物车页面能加载 /en/cart', async ({ page }) => {
    const response = await page.goto('/en/cart');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('购物车页面有内容渲染', async ({ page }) => {
    await page.goto('/zh/cart');
    // Cart page should render some text content (empty state or items)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });
});
