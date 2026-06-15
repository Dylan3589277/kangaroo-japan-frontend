import { expect, Page, Route, test } from "@playwright/test";

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockChatWithQuoteRef(
  page: Page,
  quoteRef: Record<string, unknown>,
) {
  await page.route("https://embed.tawk.to/**", (route) => route.abort());
  await page.route("https://res.wx.qq.com/**", (route) => route.abort());
  await page.route("**/api/support/chat", async (route) => {
    return json(route, {
      code: 0,
      data: {
        action: "answered",
        reply: "这是您发来的商品报价，请核对～",
        quote_ref: quoteRef,
        sourceIds: [],
        answeredBy: "m4-hermes-customer-support",
        requiresTicket: false,
        isHighRisk: false,
      },
    });
  });
}

test.describe("support H5 quote_ref card", () => {
  test("renders quote card with price, fees and confirm CTA when purchasable", async ({
    page,
  }) => {
    await mockChatWithQuoteRef(page, {
      platform: "mercari",
      item_id: "m12345678901",
      goods_name: "テスト商品 限定エディション",
      cover: "https://example.test/cover.jpg",
      price_jpy: 12800,
      purchasable: true,
      fee_service_jpy: 200,
      fee_agent_jpy: 0,
      domestic_shipping_note: "国内运费待确认",
      est_goods_rmb: "650",
      rate_note: "人民币按当日汇率，下单支付时为准",
    });

    await page.goto("/zh/support/h5?shop=mercari");
    await page.getByPlaceholder("请输入问题").fill("https://jp.mercari.com/item/m12345678901");
    await page.getByRole("button", { name: "发送" }).click();

    const card = page.getByTestId("support-quote-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("报价确认")).toBeVisible();
    await expect(card.getByText("テスト商品 限定エディション")).toBeVisible();
    await expect(card.getByText(/现价 ¥12,?800 日元/)).toBeVisible();
    await expect(card.getByText(/支付手续费：¥200 日元/)).toBeVisible();
    await expect(card.getByText(/代拍手续费：¥0 日元/)).toBeVisible();
    await expect(card.getByText("国内运费待确认")).toBeVisible();
    await expect(card.getByText(/约 ¥650/)).toBeVisible();
    await expect(card.getByText("（不含运费）")).toBeVisible();
    await expect(
      card.getByText("人民币按当日汇率，下单支付时为准"),
    ).toBeVisible();
    await expect(page.getByTestId("support-quote-cta")).toContainText(
      "核对无误后回复『确认』",
    );
    await expect(page.getByTestId("support-quote-unpurchasable")).toHaveCount(0);
  });

  test("shows unpurchasable reason and hides confirm CTA when not purchasable", async ({
    page,
  }) => {
    await mockChatWithQuoteRef(page, {
      platform: "mercari",
      item_id: "m99999999999",
      goods_name: "売り切れ商品",
      price_jpy: 5000,
      purchasable: false,
      unpurchasable_reason: "已售出",
    });

    await page.goto("/zh/support/h5?shop=mercari");
    await page.getByPlaceholder("请输入问题").fill("https://jp.mercari.com/item/m99999999999");
    await page.getByRole("button", { name: "发送" }).click();

    const card = page.getByTestId("support-quote-card");
    await expect(card).toBeVisible();
    await expect(page.getByTestId("support-quote-unpurchasable")).toContainText(
      "已售出",
    );
    await expect(page.getByTestId("support-quote-cta")).toHaveCount(0);
  });
});
