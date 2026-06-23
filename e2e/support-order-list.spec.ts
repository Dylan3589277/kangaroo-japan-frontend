import { expect, Page, Route, test } from "@playwright/test";

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

// 记录每次 /api/support/chat 发出的 message，并按 message 选择返回的 list 卡。
// 首条「查到日本仓进度」→ 第1页(有下一页, 无上一页); 「第2页」→ 第2页(有上一页, 无下一页)。
async function mockChatWithListCard(page: Page, sentMessages: string[]) {
  await page.route("https://embed.tawk.to/**", (route) => route.abort());
  await page.route("https://res.wx.qq.com/**", (route) => route.abort());
  await page.route("**/api/support/conversations/**/messages", (route) =>
    json(route, { code: 0, data: { messages: [] } }),
  );
  await page.route("**/api/support/chat", async (route) => {
    const body = route.request().postDataJSON() as { message?: string };
    const message = body.message || "";
    sentMessages.push(message);
    const isPage2 = message.includes("第2页");
    return json(route, {
      code: 0,
      data: {
        action: "answered",
        reply: isPage2
          ? "以下是您已购买、尚未到日本仓的订单（第2页）："
          : "以下是您已购买、尚未到日本仓的订单（点订单看已发货/未发货）：",
        list: {
          stage: "warehouse",
          title: isPage2
            ? "已购买·尚未到日本仓（第2页）"
            : "已购买·尚未到日本仓",
          items: isPage2
            ? [
                {
                  order_id: "DSJ003",
                  title: "第二页商品C",
                  status_txt: "待入库",
                  amount_rmb: 88,
                  cover: "",
                  detail_target: "order",
                },
              ]
            : [
                {
                  order_id: "DSJ001",
                  title: "测试商品A",
                  status_txt: "待入库",
                  amount_rmb: 128,
                  cover: "https://example.test/a.jpg",
                  detail_target: "order",
                },
                {
                  order_id: "DSJ002",
                  title: "测试商品B",
                  status_txt: "已发货",
                  amount_rmb: 256,
                  cover: "",
                  detail_target: "order",
                },
              ],
          page: isPage2 ? 2 : 1,
          total_pages: 2,
          has_prev: isPage2,
          has_next: !isPage2,
        },
      },
    });
  });
}

// 伪造小程序 webview：注入 wx.miniProgram.navigateTo 并记录调用 url。
async function installMiniNavStub(page: Page) {
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

async function readNav(page: Page) {
  return page.evaluate(
    () => (window as unknown as { __miniNav: string[] }).__miniNav,
  );
}

test.describe("support H5 order-list card", () => {
  test("renders the list card title + items (cover/title/status/amount)", async ({
    page,
  }) => {
    const sent: string[] = [];
    await mockChatWithListCard(page, sent);

    await page.goto("/zh/support/h5?shop=mercari");
    await page.getByPlaceholder("请输入问题").fill("查到日本仓进度");
    await page.getByRole("button", { name: "发送" }).click();

    const card = page.getByTestId("support-list-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("已购买·尚未到日本仓")).toBeVisible();
    // 两条 item
    await expect(card.getByText("测试商品A")).toBeVisible();
    await expect(card.getByText("测试商品B")).toBeVisible();
    await expect(card.getByText("待入库")).toBeVisible();
    await expect(card.getByText("已发货")).toBeVisible();
    // 金额（人民币）
    await expect(card.getByText("¥128")).toBeVisible();
    await expect(card.getByText("¥256")).toBeVisible();
  });

  test("paging buttons follow has_prev/has_next and send correct paging text", async ({
    page,
  }) => {
    const sent: string[] = [];
    await mockChatWithListCard(page, sent);

    await page.goto("/zh/support/h5?shop=mercari");
    await page.getByPlaceholder("请输入问题").fill("查到日本仓进度");
    await page.getByRole("button", { name: "发送" }).click();

    await expect(page.getByTestId("support-list-card")).toBeVisible();
    // 第1页：has_prev=false → 无上一页; has_next=true → 有下一页
    await expect(page.getByTestId("support-list-prev")).toHaveCount(0);
    const next = page.getByTestId("support-list-next");
    await expect(next).toBeVisible();

    // 点下一页：发出与 bridge 对齐的翻页文本「查到日本仓进度 第2页」。
    // 翻页是新增一条 assistant 消息（新列表卡），旧卡仍在；故断言要锁定**最新那张**卡。
    await next.click();
    await expect(page.getByText("第二页商品C")).toBeVisible();
    expect(sent).toContain("查到日本仓进度 第2页");

    // 第2页卡（最新）：has_prev=true → 有上一页; has_next=false → 无下一页。
    const page2Card = page.getByTestId("support-list-card").last();
    const prev = page2Card.getByTestId("support-list-prev");
    await expect(prev).toBeVisible();
    await expect(page2Card.getByTestId("support-list-next")).toHaveCount(0);

    // 点上一页：发出「查到日本仓进度 第1页」
    await prev.click();
    expect(sent).toContain("查到日本仓进度 第1页");
  });

  test("clicking an item navigates to mini-program order detail (detail_target=order)", async ({
    page,
  }) => {
    const sent: string[] = [];
    await installMiniNavStub(page);
    await mockChatWithListCard(page, sent);

    await page.goto("/zh/support/h5?shop=mercari");
    await page.getByPlaceholder("请输入问题").fill("查到日本仓进度");
    await page.getByRole("button", { name: "发送" }).click();

    await expect(page.getByTestId("support-list-card")).toBeVisible();
    await page.getByTestId("support-list-item-DSJ001").click();

    const navUrls = await readNav(page);
    expect(navUrls).toContain("/pages/daishujun/mine/orderDetail?id=DSJ001");
    // navigateTo 是 stub，不会真跳转
    await expect(page).toHaveURL(/\/zh\/support\/h5/);
  });

  test("clicking a shipped item navigates to mini-program express track (detail_target=express)", async ({
    page,
  }) => {
    await installMiniNavStub(page);
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
          reply: "以下是您已出仓的国际物流订单：",
          list: {
            stage: "shipped",
            title: "已出仓·国际物流",
            items: [
              {
                order_id: "DSJ100",
                title: "已发货商品",
                status_txt: "运输中",
                amount_rmb: 500,
                cover: "",
                detail_target: "express",
              },
            ],
            page: 1,
            total_pages: 1,
            has_prev: false,
            has_next: false,
          },
        },
      });
    });

    await page.goto("/zh/support/h5?shop=mercari");
    await page.getByPlaceholder("请输入问题").fill("查国际物流(出仓后)");
    await page.getByRole("button", { name: "发送" }).click();

    await expect(page.getByTestId("support-list-card")).toBeVisible();
    // 单页：上一页/下一页都不显示
    await expect(page.getByTestId("support-list-paging")).toHaveCount(0);

    await page.getByTestId("support-list-item-DSJ100").click();
    const navUrls = await readNav(page);
    expect(navUrls).toContain("/pages/daishujun/mine/express?id=DSJ100");
  });
});
