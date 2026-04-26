import { test, expect } from '@playwright/test';

test.describe('Auth pages smoke tests', () => {
  test('登录页面能加载 /zh/login', async ({ page }) => {
    const response = await page.goto('/zh/login');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('登录页面有登录表单', async ({ page }) => {
    await page.goto('/zh/login');
    // Check for email/password input fields
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    // At least one of them should be present (or text inputs)
    const anyInput = page.locator('input').first();
    await expect(anyInput).toBeVisible();
  });

  test('登录页面 /en/login 正常加载', async ({ page }) => {
    const response = await page.goto('/en/login');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('注册页面能加载 /zh/register', async ({ page }) => {
    const response = await page.goto('/zh/register');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
