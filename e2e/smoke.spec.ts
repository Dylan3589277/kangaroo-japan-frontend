import { expect, test } from "@playwright/test";
import { cartWithItem, emptyCart, mockBackend, signInForE2E } from "./mocks";

test.describe("localized storefront smoke coverage", () => {
  test("home page loads key navigation and search", async ({ page }) => {
    await mockBackend(page);

    await page.goto("/zh");

    await expect(page).toHaveURL(/\/zh\/?$/);
    await expect(page.locator("header")).toBeVisible();
    await expect(
      page.locator('header a[href$="/products"]').first(),
    ).toBeVisible();
    await expect(page.locator('header a[href$="/cart"]').first()).toBeVisible();
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
  });

  test("products page loads mocked products", async ({ page }) => {
    await mockBackend(page);

    await page.goto("/zh/products");

    await expect(page).toHaveURL(/\/zh\/products/);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText("E2E Mock Camera").first()).toBeVisible();
    await expect(
      page.locator('form#search-form input[type="text"]'),
    ).toBeVisible();
  });

  test("cart page loads empty authenticated cart state", async ({ page }) => {
    await signInForE2E(page);
    await mockBackend(page, { cart: emptyCart });

    await page.goto("/zh/cart");

    await expect(page).toHaveURL(/\/zh\/cart/);
    await expect(
      page.getByRole("heading", { name: /购物车是空的|Your cart is empty/i }),
    ).toBeVisible();
    await expect(page.locator('a[href$="/products"]').first()).toBeVisible();
  });

  test("login page exposes required credentials form controls", async ({
    page,
  }) => {
    await mockBackend(page);

    await page.goto("/zh/login");

    await expect(page).toHaveURL(/\/zh\/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("support contact page loads tawk.to widget without exposing order data", async ({
    page,
  }) => {
    await mockBackend(page);

    await page.goto("/zh/contact");

    await expect(page).toHaveURL(/\/zh\/contact/);
    await expect(page.getByRole("heading", { name: "联系客服" })).toBeVisible();
    await expect(page.getByRole("link", { name: /FAQ/ })).toBeVisible();
    await expect(
      page.locator('script#tawkto-widget[src*="embed.tawk.to"]'),
    ).toHaveCount(1);
    expect(
      await page.locator("script#tawkto-widget").getAttribute("src"),
    ).not.toContain("order");
  });

  test("admin support workbench uses scoped ticket context and human-confirmed Hermes send", async ({
    page,
  }) => {
    await signInForE2E(page, "admin");
    await mockBackend(page);

    await page.goto("/zh/admin/support");

    await expect(
      page.getByRole("heading", { name: "客服工单台账" }),
    ).toBeVisible();
    await expect(page.locator('script[src*="embed.tawk.to"]')).toHaveCount(0);
    await expect(page.getByText("SUP-E2E-0001").first()).toBeVisible();
    await expect(
      page.getByText("后端未返回额外 scope/safety 标记"),
    ).toBeVisible();
    await expect(page.getByLabel("订单号")).toHaveCount(0);
    await expect(page.getByText("DSJ-E2E-0001", { exact: true })).toBeVisible();
    await expect(page.getByText("masked=true")).toBeVisible();
    await expect(page.getByRole("link", { name: "审计记录" })).toBeVisible();
    await expect(page.getByText("仅知识库").first()).toBeVisible();
    await expect(page.getByText("仅本客户订单").first()).toBeVisible();
    await expect(page.getByText("超出范围内容已拒答或转人工")).toBeVisible();

    const sendButton = page.getByRole("button", { name: "审阅通过并发送" });
    await expect(sendButton).toBeDisabled();
    await page.getByLabel(/我已人工审阅草稿/).check();
    await expect(sendButton).toBeEnabled();
    await sendButton.click();
    await expect(
      page.getByRole("heading", { name: "确认发送客服回复" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "确认发送" }).click();
    await expect(page.getByText("reviewedBeforeSend=true")).toBeVisible();
    await expect(page.getByText("customerScopeOnly=true")).toBeVisible();
  });

  test("checkout pre-payment page loads cart, address, and order controls", async ({
    page,
  }) => {
    await signInForE2E(page);
    await mockBackend(page, { cart: cartWithItem });

    await page.goto("/zh/checkout");

    await expect(page).toHaveURL(/\/zh\/checkout/);
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await expect(page.getByText("E2E Mock Camera").first()).toBeVisible();
    await expect(page.getByText("E2E User").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Place Order" }),
    ).toBeEnabled();
    await expect(
      page.getByText("Payment will be processed after order confirmation"),
    ).toBeVisible();
  });
});
