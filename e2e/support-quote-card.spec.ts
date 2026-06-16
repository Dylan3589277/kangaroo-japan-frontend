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

  test("auto-fires a quote from ?gid and shows the card with NO user bubble", async ({
    page,
  }) => {
    let chatCalls = 0;
    await page.route("https://embed.tawk.to/**", (route) => route.abort());
    await page.route("https://res.wx.qq.com/**", (route) => route.abort());
    await page.route("**/api/support/chat", async (route) => {
      chatCalls += 1;
      const body = route.request().postDataJSON() as { message?: string };
      // 自动报价应当用商品链接作为 message，且不暴露任何 user 气泡
      expect(body.message).toBe("https://jp.mercari.com/item/m12345678901");
      return json(route, {
        code: 0,
        data: {
          action: "answered",
          reply: "已为您调取该商品信息：",
          quote_ref: {
            platform: "mercari",
            item_id: "m12345678901",
            goods_name: "自動報価テスト商品",
            price_jpy: 9800,
            purchasable: true,
            fee_service_jpy: 200,
          },
        },
      });
    });

    await page.goto("/zh/support/h5?shop=mercari&gid=m12345678901");

    const card = page.getByTestId("support-quote-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("自動報価テスト商品")).toBeVisible();
    await expect(card.getByText(/现价 ¥9,?800 日元/)).toBeVisible();

    // 关键断言：没有任何 user 角色气泡（蓝色用户气泡）
    await expect(page.locator(".bg-\\[\\#4f67ff\\]")).toHaveCount(0);
    // 也不该把链接文本作为用户消息显示出来
    await expect(
      page.getByText("https://jp.mercari.com/item/m12345678901"),
    ).toHaveCount(0);

    // StrictMode 双挂载下也只发一次
    expect(chatCalls).toBe(1);
  });

  test("auto-quote link is NOT re-rendered as a user bubble after history polling", async ({
    page,
  }) => {
    const itemUrl = "https://jp.mercari.com/item/m12345678901";
    const conversationId = "11111111-1111-1111-1111-111111111111";

    await page.route("https://embed.tawk.to/**", (route) => route.abort());
    await page.route("https://res.wx.qq.com/**", (route) => route.abort());

    // 自动报价：返回报价卡 + 一个 conversationId，借此武装历史轮询。
    await page.route("**/api/support/chat", async (route) => {
      return json(route, {
        code: 0,
        data: {
          action: "answered",
          reply: "已为您调取该商品信息：",
          conversationId,
          quote_ref: {
            platform: "mercari",
            item_id: "m12345678901",
            goods_name: "自動報価テスト商品",
            price_jpy: 9800,
            purchasable: true,
            fee_service_jpy: 200,
          },
        },
      });
    });

    // 历史轮询：返回的 visitor 历史里**包含**那条自动报价链接，外加买家后续真消息。
    await page.route(
      `**/api/support/conversations/${conversationId}/messages**`,
      async (route) => {
        return json(route, {
          code: 0,
          data: {
            messages: [
              {
                id: "msg-auto-link",
                role: "visitor",
                content: itemUrl,
                createdAt: "2026-06-16T00:00:00.000Z",
              },
              {
                id: "msg-bot-quote",
                role: "bot",
                content: "已为您调取该商品信息：",
                createdAt: "2026-06-16T00:00:01.000Z",
              },
              {
                id: "msg-buyer-real",
                role: "visitor",
                content: "确认",
                createdAt: "2026-06-16T00:00:30.000Z",
              },
            ],
          },
        });
      },
    );

    await page.goto("/zh/support/h5?shop=mercari&gid=m12345678901");

    // 等历史轮询把会话历史拉回并渲染（买家后续真消息"确认"作为 user 气泡出现），
    // 证明轮询确实跑过、且历史里那条自动报价链接已被剔除。
    await expect(
      page.locator(".bg-\\[\\#4f67ff\\]").filter({ hasText: "确认" }),
    ).toBeVisible();

    // 关键断言：那条自动报价链接绝不渲染成 user 气泡，也不以任何文本出现
    await expect(
      page.locator(".bg-\\[\\#4f67ff\\]").filter({ hasText: itemUrl }),
    ).toHaveCount(0);
    await expect(page.getByText(itemUrl)).toHaveCount(0);
  });

  test("auto-quote card survives history polling that returns NO quoteRef", async ({
    page,
  }) => {
    const itemUrl = "https://jp.mercari.com/item/m12345678901";
    const conversationId = "22222222-2222-2222-2222-222222222222";

    await page.route("https://embed.tawk.to/**", (route) => route.abort());
    await page.route("https://res.wx.qq.com/**", (route) => route.abort());

    // 自动报价：返回报价卡 + 一个 conversationId，借此武装历史轮询。
    await page.route("**/api/support/chat", async (route) => {
      return json(route, {
        code: 0,
        data: {
          action: "answered",
          reply: "已为您调取该商品信息：",
          conversationId,
          quote_ref: {
            platform: "mercari",
            item_id: "m12345678901",
            goods_name: "自動報価テスト商品",
            price_jpy: 9800,
            purchasable: true,
            fee_service_jpy: 200,
          },
        },
      });
    });

    // 历史轮询：服务端历史**完全不含 quoteRef**（只有自动报价链接 + 买家真消息）。
    // 这正是会把客户端追加的报价卡冲掉的历史轮询场景。
    await page.route(
      `**/api/support/conversations/${conversationId}/messages**`,
      async (route) => {
        return json(route, {
          code: 0,
          data: {
            messages: [
              {
                id: "msg-auto-link",
                role: "visitor",
                content: itemUrl,
                createdAt: "2026-06-16T00:00:00.000Z",
              },
              {
                id: "msg-bot-quote",
                role: "bot",
                content: "已为您调取该商品信息：",
                createdAt: "2026-06-16T00:00:01.000Z",
              },
              {
                id: "msg-buyer-real",
                role: "visitor",
                content: "确认",
                createdAt: "2026-06-16T00:00:30.000Z",
              },
            ],
          },
        });
      },
    );

    await page.goto("/zh/support/h5?shop=mercari&gid=m12345678901");

    // 先确认自动报价卡渲染出来
    const card = page.getByTestId("support-quote-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("自動報価テスト商品")).toBeVisible();

    // 等历史轮询跑过：买家真消息"确认"作为 user 气泡出现，证明 setItems 已整体替换过 items。
    await expect(
      page.locator(".bg-\\[\\#4f67ff\\]").filter({ hasText: "确认" }),
    ).toBeVisible();

    // 关键断言：历史轮询（不含 quoteRef）整体替换 items 之后，自动报价卡**依然在显示**。
    await expect(card).toBeVisible();
    await expect(card.getByText("自動報価テスト商品")).toBeVisible();
    await expect(card.getByText(/现价 ¥9,?800 日元/)).toBeVisible();

    // 链接不冒泡：那条自动报价链接绝不渲染成 user 气泡，也不以任何文本出现。
    await expect(
      page.locator(".bg-\\[\\#4f67ff\\]").filter({ hasText: itemUrl }),
    ).toHaveCount(0);
    await expect(page.getByText(itemUrl)).toHaveCount(0);
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
