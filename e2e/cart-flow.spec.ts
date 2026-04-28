/**
 * E2E Tests: Cart Flow — Add to Cart → Modify → Proceed to Checkout
 *
 * Covers:
 * - Cart page redirects to login when not authenticated
 * - Empty cart shows empty state with "Browse Products" link
 * - Cart with items shows product details, quantities, and totals
 * - User can update item quantity
 * - User can remove items from cart
 * - "Proceed to Checkout" button navigates to checkout page
 *
 * Note: Cart & checkout pages require authentication.
 * These tests set up auth state + mock APIs.
 */
import { test, expect, Page } from '@playwright/test';
import {
  MOCK_USER,
  MOCK_ACCESS_TOKEN,
  MOCK_CART_WITH_ITEMS,
  MOCK_CART_EMPTY,
  MOCK_CART_UPDATED,
  MOCK_PRODUCTS_PAGE_RESPONSE,
  MOCK_CATEGORIES,
} from './mock-data';

const BASE = '/en';

/**
 * Pre-set auth state in localStorage so the cart/checkout pages think user is logged in.
 */
async function setAuthenticated(page: Page) {
  await page.evaluate(
    ({ user, token }) => {
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            user,
            accessToken: token,
            isAuthenticated: true,
          },
        })
      );
    },
    { user: MOCK_USER, token: MOCK_ACCESS_TOKEN }
  );
}

/**
 * Mock public APIs so pages render without backend.
 */
async function mockPublicApis(page: Page) {
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

  await page.route('**/api/v1/categories*', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: MOCK_CATEGORIES }),
    });
  });
}

test.describe('Cart Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
  });

  test('Cart page redirects to login when not authenticated', async ({ page }) => {
    await page.goto(`${BASE}/cart`);
    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('Cart page shows empty state when cart has no items', async ({ page }) => {
    await setAuthenticated(page);

    // Mock empty cart API
    await page.route('**/api/v1/cart', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: null }),
      });
    });

    await mockPublicApis(page);

    await page.goto(`${BASE}/cart`);

    // Should show empty cart message
    await expect(page.locator('text=empty').first()).toBeVisible({ timeout: 10000 });

    // Should have a "Browse Products" link/button
    const browseLink = page.locator('a[href*="products"]');
    await expect(browseLink).toBeVisible();
  });

  test('Cart page displays items when cart has products', async ({ page }) => {
    await setAuthenticated(page);

    // Mock cart API with items
    await page.route('**/api/v1/cart', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_CART_WITH_ITEMS }),
      });
    });

    await mockPublicApis(page);

    await page.goto(`${BASE}/cart`);

    // Should show cart page heading
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

    // Product titles should be visible
    await expect(page.locator('text=Matcha').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Kimono').first()).toBeVisible({ timeout: 5000 });

    // Cart summary should be visible (items count, total)
    await expect(page.locator('text=Order Summary').first()).toBeVisible();

    // "Proceed to Checkout" button should be visible
    const checkoutButton = page.locator('button:has-text("Checkout")');
    await expect(checkoutButton).toBeVisible();
  });

  test('User can update item quantity in cart', async ({ page }) => {
    await setAuthenticated(page);

    // Mock initial cart fetch
    await page.route('**/api/v1/cart', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_CART_WITH_ITEMS }),
      });
    });

    // Mock update cart item API
    await page.route('**/api/v1/cart/items/cart-item-1', (route) => {
      if (route.request().method() === 'PUT') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: MOCK_CART_UPDATED }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_CART_WITH_ITEMS }),
      });
    });

    await mockPublicApis(page);

    await page.goto(`${BASE}/cart`);

    // Wait for cart items to load
    await expect(page.locator('text=Matcha').first()).toBeVisible({ timeout: 10000 });

    // Click the "+" button to increase quantity
    // The quantity buttons are "-" and "+" buttons per item
    const addButtons = page.locator('button:has-text("+")');
    const addButton = addButtons.first();
    await addButton.click();

    // "Quantity updated" toast should appear
    await expect(page.locator('text=Quantity updated').first()).toBeVisible({ timeout: 5000 });
  });

  test('User can remove items from cart', async ({ page }) => {
    await setAuthenticated(page);

    // Mock initial cart
    await page.route('**/api/v1/cart', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_CART_WITH_ITEMS }),
      });
    });

    // Mock remove item — return cart with one less item
    // Simulate after removing first item, only the second item remains
    const cartAfterRemove = {
      ...MOCK_CART_WITH_ITEMS,
      items: [MOCK_CART_WITH_ITEMS.items[1]],
      summary: {
        ...MOCK_CART_WITH_ITEMS.summary,
        totalItems: 1,
        subtotalJpy: 4500,
        subtotalCny: 224.00,
        totalJpy: 4500,
        totalCny: 224.00,
      },
    };

    await page.route('**/api/v1/cart/items/cart-item-1', (route) => {
      if (route.request().method() === 'DELETE') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: cartAfterRemove }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_CART_WITH_ITEMS }),
      });
    });

    await mockPublicApis(page);

    await page.goto(`${BASE}/cart`);

    await expect(page.locator('text=Matcha').first()).toBeVisible({ timeout: 10000 });

    // Click "Remove" button for the first item
    const removeButtons = page.locator('button:has-text("Remove")');
    await removeButtons.first().click();

    // "Item removed" toast should appear
    await expect(page.locator('text=removed').first()).toBeVisible({ timeout: 5000 });
  });

  test('Proceed to Checkout button navigates to checkout page', async ({ page }) => {
    await setAuthenticated(page);

    await page.route('**/api/v1/cart', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_CART_WITH_ITEMS }),
      });
    });

    await page.route('**/api/v1/addresses**', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await mockPublicApis(page);

    await page.goto(`${BASE}/cart`);

    await expect(page.locator('text=Matcha').first()).toBeVisible({ timeout: 10000 });

    // Click "Proceed to Checkout" button
    const checkoutButton = page.locator('button:has-text("Checkout")');
    await checkoutButton.click();

    // Should navigate to checkout page
    await expect(page).toHaveURL(/\/checkout/);
  });
});
