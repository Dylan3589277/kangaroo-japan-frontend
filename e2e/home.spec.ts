import { test, expect } from '@playwright/test';

test.describe('Homepage smoke tests', () => {
  test('首页正常加载 /zh', async ({ page }) => {
    const response = await page.goto('/zh');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/JP-Buy/);
  });

  test('首页正常加载 /en', async ({ page }) => {
    const response = await page.goto('/en');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/JP-Buy/);
  });

  test('首页存在搜索框', async ({ page }) => {
    await page.goto('/zh');
    // Search for an input element with placeholder text (search-related)
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('首页正常渲染内容区域', async ({ page }) => {
    await page.goto('/zh');
    // The page should have a main content area
    await expect(page.locator('body')).not.toBeEmpty();
    // Status should be 200
    expect(await page.locator('h2, h3, h1').first().isVisible()).toBe(true);
  });
});
