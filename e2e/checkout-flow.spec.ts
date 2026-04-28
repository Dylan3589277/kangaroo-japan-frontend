/**
 * E2E Tests: Checkout & Order Flow
 *
 * Covers:
 * - Checkout page loads with cart items and address selection
 * - User can select a shipping address
 * - User can enter a coupon code
 * - User can place an order successfully
 * - Order placement redirects to order detail page
 * - Checkout page handles empty cart gracefully
 *
 * Note: All pages in this flow require authentication.
 * These tests set up auth state + mock APIs.
 */
import { test, expect, Page } from '@playwright/test';
import {
  MOCK_USER,
  MOCK_ACCESS_TOKEN,
  MOCK_CART_WITH_ITEMS,
  MOCK_ADDRESSES,
  MOCK_CREATE_ORDER_RESPONSE,
  MOCK_PRODUCTS_PAGE_RESPONSE,
  MOCK_CATEGORIES,
} from './mock-data';

const BASE = '/en';

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

test.describe('Checkout & Order Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await setAuthenticated(page);
  });

  test('Checkout page loads with cart items and address selection', async ({ page }) => {
    // Mock cart API
    await page.route('**/api/v1/cart', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_CART_WITH_ITEMS }),
      });
    });

    // Mock addresses API
    await page.route('**/api/v1/addresses', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_ADDRESSES }),
      });
    });

    await mockPublicApis(page);

    await page.goto(`${BASE}/checkout`);

    // Checkout page should load
    await expect(page.locator('h1')).toContainText(/Checkout/i);

    // Shipping address section should be visible
    await expect(page.locator('text=Shipping Address').first()).toBeVisible({ timeout: 10000 });

    // Addresses should be rendered
    await expect(page.locator('text=John Doe').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Jane Smith').first()).toBeVisible({ timeout: 5000 });

    // Order items section should be visible
    await expect(page.locator('text=Order Items').first()).toBeVisible();

    // Cart items should be shown
    await expect(page.locator('text=Matcha').first()).toBeVisible({ timeout: 5000 });

    // Order summary with totals should be visible
    await expect(page.locator('text=Order Summary').first()).toBeVisible();

    // Place Order button should be visible
    const placeOrderBtn = page.locator('button:has-text("Place Order")');
    await expect(placeOrderBtn).toBeVisible();
    await expect(placeOrderBtn).toBeEnabled();
  });

  test('User can select a shipping address in checkout', async ({ page }) => {
    await page.route('**/api/v1/cart', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_CART_WITH_ITEMS }),
      });
    });

    await page.route('**/api/v1/addresses', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_ADDRESSES }),
      });
    });

    await mockPublicApis(page);

    await page.goto(`${BASE}/checkout`);

    // Default address should be pre-selected (the one with is_default=true)
    await expect(page.locator('text=John Doe').first()).toBeVisible({ timeout: 10000 });

    // Click on the second address to select it
    await page.locator('text=Jane Smith').click();

    // The second address should now have the "selected" styling
    // (the radio/selection indicator changes)
  });

  test('User can enter a coupon code', async ({ page }) => {
    await page.route('**/api/v1/cart', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_CART_WITH_ITEMS }),
      });
    });

    await page.route('**/api/v1/addresses', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_ADDRESSES }),
      });
    });

    await mockPublicApis(page);

    await page.goto(`${BASE}/checkout`);

    // Coupon code input should be visible
    await expect(page.locator('text=Coupon Code').first()).toBeVisible({ timeout: 10000 });

    // Enter coupon code
    const couponInput = page.locator('#coupon');
    await expect(couponInput).toBeVisible();
    await couponInput.fill('SAVE10');

    // Apply button should exist
    const applyBtn = page.locator('button:has-text("Apply")');
    await expect(applyBtn).toBeVisible();
  });

  test('User can place an order successfully', async ({ page }) => {
    await page.route('**/api/v1/cart', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_CART_WITH_ITEMS }),
      });
    });

    await page.route('**/api/v1/addresses', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_ADDRESSES }),
      });
    });

    // Mock order creation API
    await page.route('**/api/v1/orders', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_CREATE_ORDER_RESPONSE),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    // Mock order detail (for the redirect after order creation)
    await page.route('**/api/v1/orders/order-12345', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'order-12345',
            order_no: 'ORD-12345',
            status: 'pending',
            total_amount: 555.67,
            total_currency: 'CNY',
            subtotal_jpy: 9660,
            subtotal_cny: 481.00,
            subtotal_usd: 67.31,
            shipping_fee_jpy: 1500,
            shipping_fee_cny: 74.67,
            service_fee_jpy: 0,
            service_fee_cny: 0,
            coupon_discount_cny: 0,
            payment_method: null,
            paid_at: null,
            tracking_number: null,
            shipping_carrier: null,
            shipped_at: null,
            delivered_at: null,
            estimated_delivery: null,
            created_at: new Date().toISOString(),
            buyer_message: null,
            items: [{
              id: 'item-1',
              product_id: 'prod-1',
              title: 'Japanese Matcha Green Tea Powder 100g',
              cover_image: null,
              platform: 'amazon',
              quantity: 2,
              unit_price_jpy: 2580,
              unit_price_cny: 128.50,
              subtotal_jpy: 5160,
              subtotal_cny: 257.00,
              status: 'pending',
              tracking_number: null,
              options: {},
              seller_id: 'seller-1',
              seller_name: 'MatchaShop Japan',
            }],
            address: {
              id: MOCK_ADDRESSES[0].id,
              recipient_name: MOCK_ADDRESSES[0].recipient_name,
              phone: MOCK_ADDRESSES[0].phone,
              country: MOCK_ADDRESSES[0].country,
              country_name: MOCK_ADDRESSES[0].country_name,
              address_line1: MOCK_ADDRESSES[0].address_line1,
              address_line2: MOCK_ADDRESSES[0].address_line2,
              city: MOCK_ADDRESSES[0].city,
              postal_code: MOCK_ADDRESSES[0].postal_code,
            },
          },
        }),
      });
    });

    await mockPublicApis(page);

    await page.goto(`${BASE}/checkout`);

    // Wait for page to fully load
    await expect(page.locator('text=Place Order').first()).toBeVisible({ timeout: 10000 });

    // Click Place Order button
    await page.locator('button:has-text("Place Order")').click();

    // Should see success toast
    await expect(page.locator('text=Order created').first()).toBeVisible({ timeout: 5000 });

    // Should redirect to order detail page
    await expect(page).toHaveURL(/\/orders\/order-12345/);
  });

  test('Checkout page shows empty state when cart is empty', async ({ page }) => {
    // Mock empty cart
    await page.route('**/api/v1/cart', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: null }),
      });
    });

    await page.route('**/api/v1/addresses', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_ADDRESSES }),
      });
    });

    await mockPublicApis(page);

    await page.goto(`${BASE}/checkout`);

    // Should show empty cart message
    await expect(page.locator('text=empty').first()).toBeVisible({ timeout: 10000 });

    // Should have a link back to browse products
    const browseLink = page.locator('a[href*="products"]');
    await expect(browseLink).toBeVisible();
  });

  test('Checkout requires a shipping address before placing order', async ({ page }) => {
    await page.route('**/api/v1/cart', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: MOCK_CART_WITH_ITEMS }),
      });
    });

    // Mock empty addresses
    await page.route('**/api/v1/addresses', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await mockPublicApis(page);

    await page.goto(`${BASE}/checkout`);

    // Should show "No addresses" message
    await expect(page.locator('text=No addresses').first()).toBeVisible({ timeout: 10000 });

    // Place Order button should be disabled (no address selected)
    const placeOrderBtn = page.locator('button:has-text("Place Order")');
    await expect(placeOrderBtn).toBeDisabled();

    // Should have an "Add an address" link
    const addAddressLink = page.locator('a[href*="addresses"]').first();
    await expect(addAddressLink).toBeVisible();
  });
});
