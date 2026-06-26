import { expect, Page, Route, test } from "@playwright/test";

// 回归用例：bridge 在发"选择卡（choice）/ 转人工卡（transfer_human）"时，把同一句话
// 同时放进 reply（→ 文字气泡）和 卡片内（choice.prompt / 转人工卡 note）。前端曾把两者
// 都渲染 → 同一句话冒两遍。本组用例钉死：带按钮的卡只显示一条，纯文字气泡不再重复；
// 且报价卡（intro 气泡 ≠ 卡内结构化字段）保持 intro + 卡两条不同内容。

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function abortThirdParty(page: Page) {
  await page.route("https://embed.tawk.to/**", (route) => route.abort());
  await page.route("https://res.wx.qq.com/**", (route) => route.abort());
  // 不带 conversationId 时不会轮询历史；带 gid 自动报价用例各自单独 mock。
  await page.route("**/api/support/conversations/**/messages", (route) =>
    json(route, { code: 0, data: { messages: [] } }),
  );
}

test.describe("support H5 去重：选择卡/转人工卡不再重复纯文字气泡", () => {
  test("核价确认：choice.prompt===reply 时只显示一条带【确认下单】按钮的卡, 无重复纯文字", async ({
    page,
  }) => {
    const CONFIRM_PROMPT =
      "为您核算：商品款 + 服务费 + 会员等级费（按您的会员等级和当前汇率自动计算）。请核对商品无误后回复『确认』，我为您录入订单生成待支付单。";
    await abortThirdParty(page);
    await page.route("**/api/support/chat", async (route) => {
      // 复刻 bridge _handle_purchase_intent 真实响应：reply 与 choice.prompt 一字不差。
      return json(route, {
        code: 0,
        data: {
          action: "ask_clarify",
          reply: CONFIRM_PROMPT,
          reason: "assisted_purchase_quote_confirm",
          choice: {
            prompt: CONFIRM_PROMPT,
            options: [{ label: "确认下单", send_text: "确认" }],
          },
        },
      });
    });

    await page.goto("/zh/support/h5?shop=mercari");
    await page.getByPlaceholder("请输入问题").fill("我要买这个");
    await page.getByRole("button", { name: "发送" }).click();

    // 带按钮的选择卡出现，且含【确认下单】按钮。
    const card = page.getByTestId("support-choice-card");
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: "确认下单" })).toBeVisible();
    // 卡内顶部展示核价话术。
    await expect(card.getByText(CONFIRM_PROMPT)).toBeVisible();

    // 关键去重断言：整页该核价话术只出现一次（卡内那条），无上方无按钮纯文字气泡。
    await expect(page.getByText(CONFIRM_PROMPT)).toHaveCount(1);
    // 也没有蓝色/白色的独立 support 文字气泡承载同一句（卡片不是 .leading-6 文字气泡）。
    await expect(page.locator(".leading-6").filter({ hasText: CONFIRM_PROMPT })).toHaveCount(0);
  });

  test("链接选择卡：choice.prompt===reply 时只显示一条带按钮的卡, 无重复纯文字", async ({
    page,
  }) => {
    const LINK_PROMPT =
      "已识别到商品链接。请问您是要【直接下单】（我为您核价并生成待支付单），还是先【咨询商品】（成色 / 包邮 / 物流时效 / 代购规则 / 费用都可以问）？";
    await abortThirdParty(page);
    await page.route("**/api/support/chat", async (route) => {
      return json(route, {
        code: 0,
        data: {
          action: "answered",
          reply: LINK_PROMPT,
          reason: "assisted_link_choice_fixed",
          choice: {
            prompt: LINK_PROMPT,
            options: [
              { label: "直接下单", send_text: "直接下单" },
              { label: "咨询商品", send_text: "咨询商品" },
            ],
          },
        },
      });
    });

    await page.goto("/zh/support/h5?shop=mercari");
    await page.getByPlaceholder("请输入问题").fill("https://item.fril.jp/abc");
    await page.getByRole("button", { name: "发送" }).click();

    const card = page.getByTestId("support-choice-card");
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: "直接下单" })).toBeVisible();
    await expect(card.getByRole("button", { name: "咨询商品" })).toBeVisible();

    // 去重：该提示语整页只出现一次（卡内）。
    await expect(page.getByText(LINK_PROMPT)).toHaveCount(1);
    await expect(page.locator(".leading-6").filter({ hasText: LINK_PROMPT })).toHaveCount(0);
  });

  test("转人工卡：reply===humanTransferNote 时只显示一条带按钮的转人工卡, 无重复纯文字", async ({
    page,
  }) => {
    const TRANSFER_REPLY =
      "下单暂时无法自动处理，我为您转接人工客服帮您录入这笔代购订单。";
    await abortThirdParty(page);
    await page.route("**/api/support/chat", async (route) => {
      // 复刻 bridge _transfer 真实响应：action=transfer_human，reply 即转人工卡 note。
      return json(route, {
        code: 0,
        data: {
          action: "transfer_human",
          reply: TRANSFER_REPLY,
          reason: "assisted_purchase_endpoint_failed",
          fallback: "53kf",
        },
      });
    });

    await page.goto("/zh/support/h5?shop=mercari");
    await page.getByPlaceholder("请输入问题").fill("确认");
    await page.getByRole("button", { name: "发送" }).click();

    // 带按钮的转人工卡出现。
    const card = page.getByTestId("human-transfer-card");
    await expect(card).toBeVisible();
    await expect(page.getByTestId("contact-human-button")).toBeVisible();
    // 卡内展示转人工话术。
    await expect(card.getByText(TRANSFER_REPLY)).toBeVisible();

    // 去重：该话术整页只出现一次（即卡内那条），无上方重复纯文字气泡。
    // 注意转人工卡 note 本身也是 .leading-6，所以唯一一条 .leading-6 命中应在卡内。
    await expect(page.getByText(TRANSFER_REPLY)).toHaveCount(1);
    await expect(
      page.locator(".leading-6").filter({ hasText: TRANSFER_REPLY }),
    ).toHaveCount(1);
  });

  test("报价卡回归：intro(reply) ≠ 卡内字段 → intro 气泡 + 报价卡两条都在, 不被误去重", async ({
    page,
  }) => {
    const QUOTE_INTRO = "这是您发的商品报价，请核对商品、价格无误后回复『确认』，我为您录入订单：";
    await abortThirdParty(page);
    await page.route("**/api/support/chat", async (route) => {
      return json(route, {
        code: 0,
        data: {
          action: "answered",
          reply: QUOTE_INTRO,
          quote_ref: {
            platform: "mercari",
            item_id: "m12345678901",
            goods_name: "報価テスト商品",
            price_jpy: 12800,
            purchasable: true,
            fee_service_jpy: 200,
          },
        },
      });
    });

    await page.goto("/zh/support/h5?shop=mercari");
    await page.getByPlaceholder("请输入问题").fill("https://jp.mercari.com/item/m12345678901");
    await page.getByRole("button", { name: "发送" }).click();

    // 报价卡在。
    const card = page.getByTestId("support-quote-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("報価テスト商品")).toBeVisible();

    // 关键回归断言：intro 文字气泡仍然单独显示（reply ≠ 卡内任何字段，不该被去重）。
    const introBubble = page.locator(".leading-6").filter({ hasText: QUOTE_INTRO });
    await expect(introBubble).toBeVisible();
    // intro 是 support 气泡、不在报价卡内 → 报价卡里不含这句。
    await expect(card.getByText(QUOTE_INTRO)).toHaveCount(0);
  });
});
