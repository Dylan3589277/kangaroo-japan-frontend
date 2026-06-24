import { expect, Page, Route, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// 智能客服辅助购买（CS-Assisted Purchase）待支付卡 — 前端渲染 + 去支付导航。
//
// 关系说明（与 route.ts 中继测的分工，照 list 卡同款分工）：
//   - 服务端中继「不被吞」由 src/app/api/support/chat/route.test.ts 的
//     "...forward the assisted-purchase payable card (data.proxy_buy_pay) unchanged"
//     用例覆盖（直接 import POST + stub fetch 走真实 route.ts relay，并带反向负例
//     "...without proxy_buy_pay leave data.proxy_buy_pay undefined" 抓回归）。
//   - 本 Playwright 文件在 BROWSER 层 mock /api/support/chat，专测前端：解析 proxy_buy_pay
//     → 渲染待支付卡（title/应付JPY/≈CNY/orderNo）→ risk_flag 大额提示 → 点「去支付」按
//     现有待支付卡同款 wx.miniProgram.navigateTo 导航（不调任何 JWT 收款 API）。
//
// 反向回归校验（人工/CI 可复现）：临时删 route.ts 里 `proxy_buy_pay: proxyBuyPay` 那行 →
// route.test.ts 的 forward 用例失败（data.proxy_buy_pay 变 undefined）；恢复后转绿。
// ---------------------------------------------------------------------------

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockChatWithProxyBuyPay(
  page: Page,
  proxyBuyPay: Record<string, unknown>,
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
        reply: "已为您建好待支付订单，请核对后支付～",
        reason: "assisted_purchase_created",
        proxy_buy_pay: proxyBuyPay,
        sourceIds: [],
        answeredBy: "m4-hermes-customer-support",
        requiresTicket: false,
        isHighRisk: false,
      },
    });
  });
}

// 伪造小程序 webview：注入 wx.miniProgram.navigateTo 并记录调用 url。
async function installMiniProgramNavStub(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __miniNav: string[] }).__miniNav = [];
    (
      window as unknown as {
        wx?: { miniProgram?: { navigateTo?: (o: { url: string }) => void } };
      }
    ).wx = {
      miniProgram: {
        navigateTo: (o: { url: string }) => {
          (window as unknown as { __miniNav: string[] }).__miniNav.push(o.url);
        },
      },
    };
  });
}

test.describe("support H5 proxy-buy 待支付卡 (CS-Assisted Purchase)", () => {
  test("renders payable card with title, 应付JPY, ≈CNY and orderNo", async ({
    page,
  }) => {
    await mockChatWithProxyBuyPay(page, {
      type: "proxy_buy_pay",
      orderRef: "11111111-2222-3333-4444-555555555555",
      orderNo: "PRX20260624001",
      title: "ラクマ テスト商品 限定エディション",
      platform: "rakuma",
      goodsNo: "rk123456",
      amount_jpy: 12800,
      pay_currency: "CNY",
      pay_amount: 650,
      status: "pending_payment",
      risk_flag: false,
    });

    await page.goto("/zh/support/h5?shop=mercari&uid=4");
    await page.getByPlaceholder("请输入问题").fill("确认");
    await page.getByRole("button", { name: "发送" }).click();

    const card = page.getByTestId("support-proxy-buy-pay-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("待支付订单")).toBeVisible();
    await expect(
      card.getByText("ラクマ テスト商品 限定エディション"),
    ).toBeVisible();
    await expect(card.getByText(/应付 ¥12,?800 日元/)).toBeVisible();
    await expect(card.getByText(/约 ¥650/)).toBeVisible();
    await expect(card.getByText("订单号：PRX20260624001")).toBeVisible();
    // 非大额：不显示风险提示
    await expect(
      page.getByTestId("support-proxy-buy-pay-risk"),
    ).toHaveCount(0);
  });

  test("with pay_amount missing, shows only JPY (no CNY)", async ({ page }) => {
    await mockChatWithProxyBuyPay(page, {
      type: "proxy_buy_pay",
      orderRef: "22222222-2222-3333-4444-555555555555",
      orderNo: "PRX20260624002",
      title: "只显日元的商品",
      platform: "yahoofrima",
      amount_jpy: 9800,
      pay_currency: "CNY",
      // pay_amount 缺省 → 只显 JPY
      status: "pending_payment",
      risk_flag: false,
    });

    await page.goto("/zh/support/h5?shop=mercari&uid=4");
    await page.getByPlaceholder("请输入问题").fill("确认");
    await page.getByRole("button", { name: "发送" }).click();

    const card = page.getByTestId("support-proxy-buy-pay-card");
    await expect(card).toBeVisible();
    await expect(card.getByText(/应付 ¥9,?800 日元/)).toBeVisible();
    // 没有 CNY 估算时不出现「约 ¥」
    await expect(card.getByText(/约 ¥/)).toHaveCount(0);
  });

  test("risk_flag=true shows the big-amount notice", async ({ page }) => {
    await mockChatWithProxyBuyPay(page, {
      type: "proxy_buy_pay",
      orderRef: "33333333-2222-3333-4444-555555555555",
      orderNo: "PRX20260624003",
      title: "高額テスト商品",
      platform: "rakuma",
      amount_jpy: 88000,
      pay_currency: "CNY",
      pay_amount: 4321,
      status: "pending_payment",
      risk_flag: true,
    });

    await page.goto("/zh/support/h5?shop=mercari&uid=4");
    await page.getByPlaceholder("请输入问题").fill("确认");
    await page.getByRole("button", { name: "发送" }).click();

    const card = page.getByTestId("support-proxy-buy-pay-card");
    await expect(card).toBeVisible();
    const risk = page.getByTestId("support-proxy-buy-pay-risk");
    await expect(risk).toBeVisible();
    await expect(risk).toContainText("金额较大，请核对后支付");
  });

  test("去支付 (mini-program webview + configured path) navigates to the mini-program pay page, never a JWT API", async ({
    page,
  }) => {
    let chatCalls = 0;
    // 记录是否有任何对收款/建单 API 的直接调用（不该有）。
    let jwtPayCalls = 0;
    await page.route("**/proxy-buy/**", (route) => {
      jwtPayCalls += 1;
      return json(route, { success: false }, 401);
    });
    await page.route("**/newage/**", (route) => {
      jwtPayCalls += 1;
      return json(route, { success: false }, 401);
    });

    await installMiniProgramNavStub(page);
    await page.route("https://embed.tawk.to/**", (route) => route.abort());
    await page.route("https://res.wx.qq.com/**", (route) => route.abort());
    await page.route("**/api/support/conversations/**/messages", (route) =>
      json(route, { code: 0, data: { messages: [] } }),
    );
    await page.route("**/api/support/chat", async (route) => {
      chatCalls += 1;
      return json(route, {
        code: 0,
        data: {
          action: "answered",
          reply: "已为您建好待支付订单，请核对后支付～",
          proxy_buy_pay: {
            type: "proxy_buy_pay",
            orderRef: "44444444-2222-3333-4444-555555555555",
            orderNo: "PRX20260624004",
            title: "去支付导航测试商品",
            platform: "rakuma",
            amount_jpy: 12800,
            pay_currency: "CNY",
            pay_amount: 650,
            status: "pending_payment",
            risk_flag: false,
          },
        },
      });
    });

    await page.goto("/zh/support/h5?shop=mercari&uid=4");
    await page.getByPlaceholder("请输入问题").fill("确认");
    await page.getByRole("button", { name: "发送" }).click();

    const card = page.getByTestId("support-proxy-buy-pay-card");
    await expect(card).toBeVisible();

    const payBtn = page.getByTestId("support-proxy-buy-pay-btn");
    await expect(payBtn).toBeEnabled();
    await payBtn.click();

    // 去支付 = mirror 现有待支付卡：wx.miniProgram.navigateTo 跳小程序内顾客登录态的代拍支付页，
    // path 来自 NEXT_PUBLIC_PROXY_BUY_PAY_PAGE_PATH（e2e 注入），带 ?id=<orderRef>。
    const navUrls = await page.evaluate(
      () => (window as unknown as { __miniNav: string[] }).__miniNav,
    );
    expect(navUrls.length).toBe(1);
    expect(navUrls[0]).toContain(
      encodeURIComponent("44444444-2222-3333-4444-555555555555"),
    );
    // 没离开 H5 页（navigateTo 是 stub）
    await expect(page).toHaveURL(/\/zh\/support\/h5/);
    // 关键：从没直接调 JWT-required 的 proxy-buy / newage 收款端点。
    expect(jwtPayCalls).toBe(0);
    // 只发了那一条「确认」聊天请求，没把购买/支付意图重复发后端。
    expect(chatCalls).toBe(1);
  });

  test("no proxy_buy_pay in response → card is absent (switch OFF = dormant, zero impact)", async ({
    page,
  }) => {
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
          reply: "好的，我帮您看看～",
        },
      });
    });

    await page.goto("/zh/support/h5?shop=mercari&uid=4");
    await page.getByPlaceholder("请输入问题").fill("帮我看看这个");
    await page.getByRole("button", { name: "发送" }).click();
    await expect(page.getByText("好的，我帮您看看～")).toBeVisible();

    // 开关 OFF / 普通回答：不渲染待支付卡。
    await expect(
      page.getByTestId("support-proxy-buy-pay-card"),
    ).toHaveCount(0);
  });
});
