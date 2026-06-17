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
      "回复『确认』",
    );
    // 可购卡：展示"咨询"和"我要购买"两个按钮
    await expect(page.getByTestId("support-quote-btn-consult")).toBeVisible();
    await expect(page.getByTestId("support-quote-btn-buy")).toBeVisible();
    await expect(page.getByTestId("support-quote-unpurchasable")).toHaveCount(0);
  });

  test("consult button only focuses/prefills the input, never auto-sends", async ({
    page,
  }) => {
    let chatCalls = 0;
    await mockChatWithQuoteRef(page, {
      platform: "mercari",
      item_id: "m12345678901",
      goods_name: "テスト商品",
      price_jpy: 12800,
      purchasable: true,
    });
    // 计数自动报价之外的发送次数；本用例不带 gid，所以首条发送来自手动 fill。
    await page.route("**/api/support/conversations/**/messages", (route) =>
      json(route, { code: 0, data: { messages: [] } }),
    );

    await page.goto("/zh/support/h5?shop=mercari");
    await page.getByPlaceholder("请输入问题").fill("https://jp.mercari.com/item/m12345678901");
    await page.getByRole("button", { name: "发送" }).click();
    await expect(page.getByTestId("support-quote-card")).toBeVisible();

    // 记录点"咨询"之前的 /api/support/chat 调用次数
    await page.route("**/api/support/chat", async (route) => {
      chatCalls += 1;
      return json(route, {
        code: 0,
        data: { action: "answered", reply: "ok" },
      });
    });

    await page.getByTestId("support-quote-btn-consult").click();
    // 点"咨询"不发送任何消息，仅预填+聚焦
    await expect(page.getByPlaceholder("请输入问题")).toHaveValue(
      "我想咨询这个商品",
    );
    await expect(page.getByPlaceholder("请输入问题")).toBeFocused();
    expect(chatCalls).toBe(0);
  });

  test("buy button sends a single explicit purchase-intent message", async ({
    page,
  }) => {
    const buyMessages: string[] = [];
    await page.route("https://embed.tawk.to/**", (route) => route.abort());
    await page.route("https://res.wx.qq.com/**", (route) => route.abort());
    await page.route("**/api/support/conversations/**/messages", (route) =>
      json(route, { code: 0, data: { messages: [] } }),
    );
    await page.route("**/api/support/chat", async (route) => {
      const body = route.request().postDataJSON() as { message?: string };
      if (body.message) buyMessages.push(body.message);
      // 首条（手动 fill 的链接）返回报价卡；之后的购买意图随便回个文本即可
      const isItemLink = (body.message || "").includes("/item/");
      return json(route, {
        code: 0,
        data: {
          action: "answered",
          reply: isItemLink ? "这是报价" : "好的，我帮您转人工录入订单～",
          quote_ref: isItemLink
            ? {
                platform: "mercari",
                item_id: "m12345678901",
                goods_name: "テスト商品",
                price_jpy: 12800,
                purchasable: true,
              }
            : undefined,
        },
      });
    });

    await page.goto("/zh/support/h5?shop=mercari");
    await page.getByPlaceholder("请输入问题").fill("https://jp.mercari.com/item/m12345678901");
    await page.getByRole("button", { name: "发送" }).click();
    await expect(page.getByTestId("support-quote-card")).toBeVisible();

    await page.getByTestId("support-quote-btn-buy").click();

    // 购买意图作为 user 气泡出现，且只发了这一条购买消息
    await expect(
      page.locator(".bg-\\[\\#4f67ff\\]").filter({ hasText: "我要购买此商品" }),
    ).toBeVisible();
    const purchaseSends = buyMessages.filter((m) => m === "我要购买此商品");
    expect(purchaseSends).toHaveLength(1);
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

  test("shows unpurchasable reason once (no duplicate text bubble) and hides confirm CTA", async ({
    page,
  }) => {
    // 后端开场白与卡内不可购原因同义（都含「已售」），#4 要求只保留卡内那一条。
    await page.route("https://embed.tawk.to/**", (route) => route.abort());
    await page.route("https://res.wx.qq.com/**", (route) => route.abort());
    await page.route("**/api/support/chat", async (route) => {
      return json(route, {
        code: 0,
        data: {
          action: "answered",
          reply: "商品已售，建议蹲同款或换链接",
          quote_ref: {
            platform: "mercari",
            item_id: "m99999999999",
            goods_name: "売り切れ商品",
            price_jpy: 5000,
            purchasable: false,
            unpurchasable_reason: "商品已售，建议蹲同款或换链接",
          },
        },
      });
    });

    await page.goto("/zh/support/h5?shop=mercari");
    await page.getByPlaceholder("请输入问题").fill("https://jp.mercari.com/item/m99999999999");
    await page.getByRole("button", { name: "发送" }).click();

    const card = page.getByTestId("support-quote-card");
    await expect(card).toBeVisible();
    await expect(page.getByTestId("support-quote-unpurchasable")).toContainText(
      "商品已售",
    );
    // #4 去重：整页「商品已售，建议蹲同款或换链接」只出现一次（卡内底部那条）。
    await expect(
      page.getByText("商品已售，建议蹲同款或换链接"),
    ).toHaveCount(1);
    await expect(page.getByTestId("support-quote-cta")).toHaveCount(0);
    // 不可购卡：两个按钮都不显示
    await expect(page.getByTestId("support-quote-btn-consult")).toHaveCount(0);
    await expect(page.getByTestId("support-quote-btn-buy")).toHaveCount(0);
  });
});

test.describe("support H5 quote_ref card · yahoo", () => {
  test("auto-fires a yahoo quote from ?gid&shop=yahoo with yahoo auction URL, no user bubble", async ({
    page,
  }) => {
    let chatCalls = 0;
    await page.route("https://embed.tawk.to/**", (route) => route.abort());
    await page.route("https://res.wx.qq.com/**", (route) => route.abort());
    await page.route("**/api/support/chat", async (route) => {
      chatCalls += 1;
      const body = route.request().postDataJSON() as { message?: string };
      // #6：yahoo 从商品页进客服也应自动弹卡，且用 yahoo 拍卖链接作为 message。
      expect(body.message).toBe(
        "https://auctions.yahoo.co.jp/jp/auction/y67890",
      );
      return json(route, {
        code: 0,
        data: {
          action: "answered",
          reply: "已为您调取该商品信息：",
          quote_ref: {
            platform: "yahoo",
            sale_type: "auction",
            item_id: "y67890",
            goods_name: "ヤフオク自動報価テスト商品",
            price_jpy: 3000,
            current_bid: 3000,
            left_time: "6月17日 21:30",
            bid_num: 5,
            deposit_state: "unknown",
          },
        },
      });
    });

    await page.goto("/zh/support/h5?shop=yahoo&gid=y67890");

    const card = page.getByTestId("support-quote-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("ヤフオク自動報価テスト商品")).toBeVisible();
    await expect(page.getByTestId("support-quote-auction-info")).toContainText(
      "当前出价",
    );
    // 没有任何 user 角色气泡，也不把链接文本作为用户消息显示
    await expect(page.locator(".bg-\\[\\#4f67ff\\]")).toHaveCount(0);
    await expect(
      page.getByText("https://auctions.yahoo.co.jp/jp/auction/y67890"),
    ).toHaveCount(0);
    // StrictMode 双挂载下也只发一次
    expect(chatCalls).toBe(1);
  });

  test("yahoo 即決(sokketsu): shows contact-kefu notice, no buy/confirm buttons", async ({
    page,
  }) => {
    await mockChatWithQuoteRef(page, {
      platform: "yahoo",
      sale_type: "sokketsu",
      item_id: "y12345",
      goods_name: "ヤフオク即決テスト商品",
      price_jpy: 8800,
      purchasable: true,
      fee_service_jpy: 0,
      fee_agent_jpy: 220,
      est_goods_rmb: "450",
      action_hint: "contact_kefu",
      action_text: "即決商品需联系客服直接下单",
    });

    await page.goto("/zh/support/h5?shop=yahoo");
    await page.getByPlaceholder("请输入问题").fill("https://page.auctions.yahoo.co.jp/jp/auction/y12345");
    await page.getByRole("button", { name: "发送" }).click();

    const card = page.getByTestId("support-quote-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("ヤフオク即決テスト商品")).toBeVisible();
    await expect(card.getByText(/现价 ¥8,?800 日元/)).toBeVisible();
    await expect(card.getByText(/代拍手续费：¥220 日元/)).toBeVisible();
    // 即決 CTA：联系客服下单，且无购买/确认按钮
    await expect(page.getByTestId("support-quote-sokketsu-cta")).toContainText(
      "联系客服",
    );
    await expect(page.getByTestId("support-quote-cta")).toHaveCount(0);
    await expect(page.getByTestId("support-quote-btn-buy")).toHaveCount(0);
    await expect(page.getByTestId("support-quote-btn-consult")).toHaveCount(0);
  });

  test("yahoo 竞拍(auction) deposit ok: shows bid ceiling, no buy/confirm buttons", async ({
    page,
  }) => {
    await mockChatWithQuoteRef(page, {
      platform: "yahoo",
      sale_type: "auction",
      item_id: "y67890",
      goods_name: "ヤフオク竞拍テスト商品",
      price_jpy: 3000,
      current_bid: 3000,
      buyout_jpy: 12000,
      left_time: "6月17日 21:30",
      bid_num: 5,
      deposit_state: "ok",
      deposit_balance_rmb: 500,
      max_bid_allowed_jpy: 60000,
    });

    await page.goto("/zh/support/h5?shop=yahoo");
    await page.getByPlaceholder("请输入问题").fill("https://page.auctions.yahoo.co.jp/jp/auction/y67890");
    await page.getByRole("button", { name: "发送" }).click();

    const card = page.getByTestId("support-quote-card");
    await expect(card).toBeVisible();
    await expect(page.getByTestId("support-quote-auction-info")).toContainText(
      "当前出价",
    );
    await expect(page.getByTestId("support-quote-auction-info")).toContainText(
      "一口价",
    );
    await expect(page.getByTestId("support-quote-auction-info")).toContainText(
      "6月17日 21:30",
    );
    // 押金充足：显示可出价上限
    const okBar = page.getByTestId("support-quote-deposit-ok");
    await expect(okBar).toBeVisible();
    await expect(okBar).toContainText("可出价上限");
    await expect(okBar).toContainText(/¥60,?000/);
    // 竞拍卡不走录单：无购买/确认/咨询按钮
    await expect(page.getByTestId("support-quote-cta")).toHaveCount(0);
    await expect(page.getByTestId("support-quote-btn-buy")).toHaveCount(0);
    await expect(page.getByTestId("support-quote-btn-recharge")).toHaveCount(0);
  });

  test("yahoo 竞拍(auction) deposit insufficient: suggests recharge + recharge entry", async ({
    page,
  }) => {
    await mockChatWithQuoteRef(page, {
      platform: "yahoo",
      sale_type: "auction",
      item_id: "y55555",
      goods_name: "押金不足テスト商品",
      price_jpy: 20000,
      current_bid: 20000,
      buyout_jpy: 0,
      left_time: "6月18日 12:00",
      bid_num: 12,
      deposit_state: "insufficient",
      suggest_recharge_rmb: 200,
      max_bid_allowed_jpy: 0,
    });

    await page.goto("/zh/support/h5?shop=yahoo");
    await page.getByPlaceholder("请输入问题").fill("https://page.auctions.yahoo.co.jp/jp/auction/y55555");
    await page.getByRole("button", { name: "发送" }).click();

    const card = page.getByTestId("support-quote-card");
    await expect(card).toBeVisible();
    // 无一口价(buyout=0)时不显示一口价行
    await expect(page.getByTestId("support-quote-auction-info")).not.toContainText(
      "一口价",
    );
    const bar = page.getByTestId("support-quote-deposit-insufficient");
    await expect(bar).toBeVisible();
    await expect(bar).toContainText("建议充值");
    await expect(bar).toContainText(/¥200/);
    // 充值入口存在；path 未配置时按钮禁用并显示「充值入口待配置」
    const rechargeBtn = page.getByTestId("support-quote-btn-recharge");
    await expect(rechargeBtn).toBeVisible();
    await expect(rechargeBtn).toBeDisabled();
    await expect(rechargeBtn).toContainText("充值入口待配置");
    // 竞拍卡不走录单
    await expect(page.getByTestId("support-quote-btn-buy")).toHaveCount(0);
    await expect(page.getByTestId("support-quote-cta")).toHaveCount(0);
  });
});

test.describe("support H5 quote_ref card · optional services", () => {
  test("renders optional-services区 (单行精确费用), and carries选择 into buy intent", async ({
    page,
  }) => {
    const buyMessages: string[] = [];
    await page.route("https://embed.tawk.to/**", (route) => route.abort());
    await page.route("https://res.wx.qq.com/**", (route) => route.abort());
    await page.route("**/api/support/conversations/**/messages", (route) =>
      json(route, { code: 0, data: { messages: [] } }),
    );
    await page.route("**/api/support/chat", async (route) => {
      const body = route.request().postDataJSON() as { message?: string };
      if (body.message) buyMessages.push(body.message);
      const isItemLink = (body.message || "").includes("/item/");
      return json(route, {
        code: 0,
        data: {
          action: "answered",
          reply: isItemLink ? "这是报价" : "好的，我帮您转人工录入订单～",
          quote_ref: isItemLink
            ? {
                platform: "mercari",
                item_id: "m12345678901",
                goods_name: "テスト商品",
                price_jpy: 12800,
                purchasable: true,
                // 新契约：安心鉴定为扁平精确费用，不再有 category_options。
                optional_services: [
                  {
                    code: "misdelivery_check",
                    label: "错发漏发检查",
                    fee_jpy: 100,
                  },
                  {
                    code: "pre_inbound_photo",
                    label: "入库前拍照",
                    fee_jpy: 100,
                  },
                  {
                    code: "mercari_anshin_kantei",
                    label: "mercari安心鉴定",
                    note: "建议追加，有保障",
                    fee_jpy: 1700,
                  },
                ],
              }
            : undefined,
        },
      });
    });

    await page.goto("/zh/support/h5?shop=mercari");
    await page.getByPlaceholder("请输入问题").fill("https://jp.mercari.com/item/m12345678901");
    await page.getByRole("button", { name: "发送" }).click();

    // 可选服务区出现，三项都在
    const svcArea = page.getByTestId("support-quote-optional-services");
    await expect(svcArea).toBeVisible();
    await expect(svcArea.getByText("错发漏发检查")).toBeVisible();
    await expect(svcArea.getByText("入库前拍照")).toBeVisible();
    await expect(svcArea.getByText("mercari安心鉴定")).toBeVisible();
    await expect(svcArea.getByText("建议追加，有保障")).toBeVisible();
    // 安心鉴定为单行精确费用（¥1,700），不再有品类按钮
    await expect(svcArea.getByText(/¥1,?700 日元/)).toBeVisible();
    await expect(page.getByTestId("support-quote-anchin-cat-watch")).toHaveCount(
      0,
    );

    // 勾选错发漏发检查 + 安心鉴定
    await page.getByTestId("support-quote-service-misdelivery_check").check();
    await page.getByTestId("support-quote-service-mercari_anshin_kantei").check();

    // 点「我要购买」，购买意图里带出已勾选服务与精确费用
    await page.getByTestId("support-quote-btn-buy").click();
    const buyIntent = buyMessages.find((m) => m.startsWith("我要购买此商品"));
    expect(buyIntent).toBeTruthy();
    expect(buyIntent).toContain("错发漏发检查");
    expect(buyIntent).toContain("mercari安心鉴定");
    expect(buyIntent).toContain("1700日元");
  });
});

test.describe("support H5 quote_ref card · 高额风险确认 (>5万)", () => {
  test("seller_risk.needs_confirm: 显著展示风险卡, gates buy until confirmed", async ({
    page,
  }) => {
    const buyMessages: string[] = [];
    await page.route("https://embed.tawk.to/**", (route) => route.abort());
    await page.route("https://res.wx.qq.com/**", (route) => route.abort());
    await page.route("**/api/support/conversations/**/messages", (route) =>
      json(route, { code: 0, data: { messages: [] } }),
    );
    await page.route("**/api/support/chat", async (route) => {
      const body = route.request().postDataJSON() as { message?: string };
      if (body.message) buyMessages.push(body.message);
      const isItemLink = (body.message || "").includes("/item/");
      return json(route, {
        code: 0,
        data: {
          action: "answered",
          reply: isItemLink ? "这是报价" : "好的，我帮您转人工录入订单～",
          quote_ref: isItemLink
            ? {
                platform: "mercari",
                item_id: "m88888888888",
                goods_name: "高額テスト商品",
                price_jpy: 88000,
                purchasable: true,
                seller_risk: {
                  needs_confirm: true,
                  identity_verified: false,
                  high_rating: false,
                  rating_count: 12,
                  rating_percent: "95.0%",
                  disclaimer:
                    "一旦平台购买成功，通常不支持因卖家描述、成色差异退换。",
                },
              }
            : undefined,
        },
      });
    });

    await page.goto("/zh/support/h5?shop=mercari");
    await page.getByPlaceholder("请输入问题").fill("https://jp.mercari.com/item/m88888888888");
    await page.getByRole("button", { name: "发送" }).click();

    // 风险卡显著展示
    const riskCard = page.getByTestId("support-quote-risk-card");
    await expect(riskCard).toBeVisible();
    await expect(riskCard).toContainText("高额订单风险确认");
    await expect(riskCard).toContainText("卖家本人认证");
    await expect(riskCard).toContainText("不支持因卖家描述");

    // 未确认前：「我要购买」被禁用
    const buyBtn = page.getByTestId("support-quote-btn-buy");
    await expect(buyBtn).toBeDisabled();
    await expect(page.getByTestId("support-quote-cta")).toContainText(
      "请先在上方完成『高额订单风险确认』",
    );

    // 点确认风险
    await page.getByTestId("support-quote-risk-confirm-btn").click();
    await expect(page.getByTestId("support-quote-risk-confirmed")).toBeVisible();

    // 确认后：「我要购买」可点，购买意图带出已知风险标记
    await expect(buyBtn).toBeEnabled();
    await buyBtn.click();
    const buyIntent = buyMessages.find((m) => m.startsWith("我要购买此商品"));
    expect(buyIntent).toContain("我已了解高额订单风险");
  });
});
