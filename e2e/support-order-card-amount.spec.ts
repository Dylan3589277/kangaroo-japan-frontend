import { expect, Page, Route, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// 客服 order_ref「订单信息 / 待支付」卡 — 金额回退渲染。
//
// 修复点：amountText 之前仅在 amount_rmb 存在时才有值，缺 amount_rmb 时整条
// 「应付金额」行消失，买家看不到金额。改为：优先人民币；缺 amount_rmb 时回退
// 显示日元 amount（amount 一定有）。本文件在 BROWSER 层 mock /api/support/chat
// 注入 order_ref，专测前端渲染分支：
//   ① 有 amount_rmb → 主显 ¥CNY，附「（约 …日元）」后缀
//   ② 缺 amount_rmb、有 amount → 主显「…日元」(回退，不再整行消失)
//   ③ 两者都缺 → 不显金额行
//
// 注意：这是 order_ref 卡（data-testid=support-order-card），与 CS-Assisted 的
// proxy_buy_pay 待支付卡（support-proxy-buy-pay-card）是两张不同的卡。
// ---------------------------------------------------------------------------

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockChatWithOrderRef(
  page: Page,
  orderRef: Record<string, unknown>,
) {
  await page.route("https://embed.tawk.to/**", (route) => route.abort());
  await page.route("https://res.wx.qq.com/**", (route) => route.abort());
  await page.route("**/api/support/conversations/**/messages", (route) =>
    json(route, { code: 0, data: { messages: [] } }),
  );
  await page.route("**/api/support/chat", async (route) => {
    return json(route, {
      code: 0,
      data: {
        action: "answered",
        reply: "为您找到这笔订单，请核对～",
        order_ref: orderRef,
        sourceIds: [],
        answeredBy: "m4-hermes-customer-support",
        requiresTicket: false,
        isHighRisk: false,
      },
    });
  });
}

test.describe("support H5 order_ref 卡 · 金额回退", () => {
  test("有 amount_rmb：主显人民币 + 日元换算后缀", async ({ page }) => {
    await mockChatWithOrderRef(page, {
      order_id: "DSJ20260624001",
      goods_name: "テスト商品 限定版",
      amount: "12800",
      amount_rmb: "650",
    });

    await page.goto("/zh/support/h5?shop=mercari");
    await page.getByPlaceholder("请输入问题").fill("发给我支付");
    await page.getByRole("button", { name: "发送" }).click();

    const card = page.getByTestId("support-order-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("テスト商品 限定版")).toBeVisible();
    // 主显人民币，附日元换算
    await expect(card.getByText(/应付金额：¥650/)).toBeVisible();
    await expect(card.getByText(/约 12800 日元/)).toBeVisible();
  });

  test("缺 amount_rmb、有 amount：回退显示日元（金额行不消失）", async ({
    page,
  }) => {
    await mockChatWithOrderRef(page, {
      order_id: "DSJ20260624002",
      goods_name: "只有日元的商品",
      amount: "9800",
      // amount_rmb 缺省 → 回退显示日元
    });

    await page.goto("/zh/support/h5?shop=mercari");
    await page.getByPlaceholder("请输入问题").fill("发给我支付");
    await page.getByRole("button", { name: "发送" }).click();

    const card = page.getByTestId("support-order-card");
    await expect(card).toBeVisible();
    // 关键：金额行仍在，回退为日元（修复前这一整行会消失）
    await expect(card.getByText(/应付金额：9800 日元/)).toBeVisible();
    // 回退态不重复出现「（约 …日元）」后缀
    await expect(card.getByText(/约 9800 日元/)).toHaveCount(0);
  });

  test("amount 与 amount_rmb 都缺：不显金额行（零回归）", async ({ page }) => {
    await mockChatWithOrderRef(page, {
      order_id: "DSJ20260624003",
      goods_name: "无金额商品",
      // amount / amount_rmb 都缺
    });

    await page.goto("/zh/support/h5?shop=mercari");
    await page.getByPlaceholder("请输入问题").fill("发给我支付");
    await page.getByRole("button", { name: "发送" }).click();

    const card = page.getByTestId("support-order-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("无金额商品")).toBeVisible();
    // 两者都缺时不渲染「应付金额」行
    await expect(card.getByText(/应付金额/)).toHaveCount(0);
  });
});
