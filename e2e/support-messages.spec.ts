import { expect, test, type Page, type Route } from "@playwright/test";

// ---------------------------------------------------------------------------
// 留言中心 H5（/zh/support/messages）browser 层回归：
// 与 support-order-list.spec.ts 同款做法 —— 在浏览器层 mock 同源 BFF
// /api/support/seller-messages（action: list | detail），只验页面渲染/过滤/
// 展开详情/错误重试与「无身份不发请求」约定，不打真实后端。
// ---------------------------------------------------------------------------

const TASK_AGREED = {
  id: 101,
  platform: "mercari",
  goods_no: "m11100001",
  item_url: "https://jp.mercari.com/item/m11100001",
  message_type: "bargain",
  customer_status: "agreed",
  status_text: "卖家已同意，可下单",
  customer_request_zh: "希望能便宜一点，诚心想要",
  target_price_jpy: 9500,
  listing_price_jpy: 12000,
  agreed_price_jpy: 9500,
  reply_zh: "可以的，已为您降价到 9500 日元",
  created_at: "2026-07-01T10:00:00+09:00",
  sent_at: "2026-07-01T10:05:00+09:00",
  reply_detected_at: "2026-07-01T12:30:00+09:00",
};

const TASK_PROCESSING = {
  id: 102,
  platform: "mercari",
  goods_no: "m22200002",
  item_url: "https://jp.mercari.com/item/m22200002",
  message_type: "question",
  customer_status: "processing",
  status_text: "审核中，待发出",
  customer_request_zh: "请问卡片表面有没有划痕？",
  created_at: "2026-07-02T09:00:00+09:00",
};

const TASK_REJECTED = {
  id: 103,
  platform: "mercari",
  goods_no: "m33300003",
  item_url: "https://jp.mercari.com/item/m33300003",
  message_type: "bargain",
  customer_status: "rejected",
  status_text: "未能发送",
  customer_request_zh: "能不能 5000 日元卖给我",
  target_price_jpy: 5000,
  listing_price_jpy: 12000,
  reject_reason_zh: "砍价目标价低于标价八折，客服会与您联系确认",
  created_at: "2026-07-02T11:00:00+09:00",
};

const TASK_CLOSED_TRANSFER = {
  id: 104,
  platform: "mercari",
  goods_no: "m44400004",
  item_url: "https://jp.mercari.com/item/m44400004",
  message_type: "question",
  customer_status: "closed",
  status_text: "卖家未回复，已结束（可转人工）",
  customer_request_zh: "请问还有货吗",
  created_at: "2026-07-03T09:00:00+09:00",
};

const LIST_PAYLOAD = {
  code: 0,
  data: {
    list: [TASK_AGREED, TASK_PROCESSING, TASK_REJECTED, TASK_CLOSED_TRANSFER],
    page: 1,
    total: 4,
  },
};

// 详情比列表多出 sent_at（时间线第二步据此点亮）。
const DETAIL_102_PAYLOAD = {
  code: 0,
  data: {
    ...TASK_PROCESSING,
    customer_status: "sent",
    status_text: "已发出，等待卖家回复",
    sent_at: "2026-07-02T09:10:00+09:00",
  },
};

// can_transfer_human 字段场景（新后端已下发该字段，优先于 status_text 子串判断）。
const TASK_NEW_BACKEND_TRANSFER = {
  id: 105,
  platform: "mercari",
  goods_no: "m55500005",
  item_url: "https://jp.mercari.com/item/m55500005",
  message_type: "question",
  customer_status: "closed",
  status_text: "商品已售出，留言结束；如需协助可联系客服",
  can_transfer_human: true,
  customer_request_zh: "还有货吗",
  created_at: "2026-07-04T09:00:00+09:00",
};

const TASK_NEW_BACKEND_NO_TRANSFER = {
  id: 106,
  platform: "mercari",
  goods_no: "m66600006",
  item_url: "https://jp.mercari.com/item/m66600006",
  message_type: "question",
  customer_status: "closed",
  status_text: "已结束",
  can_transfer_human: false,
  customer_request_zh: "还有货吗",
  created_at: "2026-07-04T10:00:00+09:00",
};

const LIST_PAYLOAD_NEW_BACKEND = {
  code: 0,
  data: {
    list: [TASK_NEW_BACKEND_TRANSFER, TASK_NEW_BACKEND_NO_TRANSFER],
    page: 1,
    total: 2,
  },
};

function json(route: Route, body: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function blockThirdParty(page: Page) {
  await page.route("https://embed.tawk.to/**", (route) => route.abort());
  await page.route("https://res.wx.qq.com/**", (route) => route.abort());
}

test.describe("留言中心 H5（/zh/support/messages）", () => {
  test("URL 无 user_id → 只显示回小程序指引，绝不调 BFF", async ({ page }) => {
    await blockThirdParty(page);
    let apiCalls = 0;
    await page.route("**/api/support/seller-messages", (route) => {
      apiCalls += 1;
      return json(route, LIST_PAYLOAD);
    });

    await page.goto("/zh/support/messages");

    await expect(
      page.getByTestId("seller-messages-missing-identity"),
    ).toBeVisible();
    await expect(page.getByText("我的留言")).toBeVisible();
    // 占位页渲染完后再等一拍，确认没有任何 BFF 请求发出。
    await page.waitForTimeout(500);
    expect(apiCalls).toBe(0);
  });

  test("列表渲染 + 状态过滤 + 砍价成功横幅 + 点卡展开时间线", async ({
    page,
  }) => {
    await blockThirdParty(page);
    const detailActions: unknown[] = [];
    await page.route("**/api/support/seller-messages", (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      if (body.action === "list") {
        return json(route, LIST_PAYLOAD);
      }
      if (body.action === "detail") {
        detailActions.push(body.id);
        return json(route, DETAIL_102_PAYLOAD);
      }
      return json(route, { code: 1, errmsg: "unexpected action" });
    });

    await page.goto("/zh/support/messages?uid=7&ts=1751500000&sig=e2e-sig");

    // 四张卡都在
    await expect(page.getByTestId("seller-messages-card-101")).toBeVisible();
    await expect(page.getByTestId("seller-messages-card-102")).toBeVisible();
    await expect(page.getByTestId("seller-messages-card-103")).toBeVisible();
    await expect(page.getByTestId("seller-messages-card-104")).toBeVisible();

    // closed 且可转人工 → 卡片上出现「联系人工客服」入口
    await expect(
      page.getByTestId("seller-messages-human-kefu-104"),
    ).toBeVisible();
    await expect(
      page.getByTestId("seller-messages-human-kefu-103"),
    ).toHaveCount(0);

    // 砍价成功横幅（agreed 高亮）+ 目标价 + 卖家回复块 + 拒绝原因块
    await expect(
      page.getByTestId("seller-messages-agreed-banner"),
    ).toContainText("砍价成功 ¥9,500 日元");
    await expect(page.getByTestId("seller-messages-card-101")).toContainText(
      "→ 目标 ¥9,500 日元",
    );
    await expect(
      page.getByTestId("seller-messages-reply-101"),
    ).toContainText("可以的，已为您降价到 9500 日元");
    await expect(
      page.getByTestId("seller-messages-reject-103"),
    ).toContainText("砍价目标价低于标价八折");

    // 点卡 102 → 内联展开详情：detail 请求带 id=102，时间线出现「已发出，等待卖家回复」
    await page.getByTestId("seller-messages-card-102").click();
    const detail = page.getByTestId("seller-messages-detail-102");
    await expect(detail).toBeVisible();
    await expect(detail).toContainText("提交留言");
    await expect(detail).toContainText("已发出，等待卖家回复");
    expect(detailActions).toContainEqual(102);

    // 过滤：已结束 → 剩 rejected + closed 两张卡；进行中 → 只剩 processing 卡；全部 → 四张全回
    await page.getByTestId("seller-messages-tab-closed").click();
    await expect(page.getByTestId("seller-messages-card-103")).toBeVisible();
    await expect(page.getByTestId("seller-messages-card-104")).toBeVisible();
    await expect(page.getByTestId("seller-messages-card-101")).toHaveCount(0);
    await expect(page.getByTestId("seller-messages-card-102")).toHaveCount(0);

    await page.getByTestId("seller-messages-tab-active").click();
    await expect(page.getByTestId("seller-messages-card-102")).toBeVisible();
    await expect(page.getByTestId("seller-messages-card-101")).toHaveCount(0);

    await page.getByTestId("seller-messages-tab-replied").click();
    await expect(page.getByTestId("seller-messages-card-101")).toBeVisible();
    await expect(page.getByTestId("seller-messages-card-103")).toHaveCount(0);

    await page.getByTestId("seller-messages-tab-all").click();
    await expect(page.getByTestId("seller-messages-card-101")).toBeVisible();
    await expect(page.getByTestId("seller-messages-card-102")).toBeVisible();
    await expect(page.getByTestId("seller-messages-card-103")).toBeVisible();
    await expect(page.getByTestId("seller-messages-card-104")).toBeVisible();
  });

  test("列表加载失败 → 错误态带重试按钮，点重试恢复", async ({ page }) => {
    await blockThirdParty(page);
    let listCalls = 0;
    await page.route("**/api/support/seller-messages", (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      if (body.action !== "list") {
        return json(route, { code: 1, errmsg: "unexpected action" });
      }
      listCalls += 1;
      if (listCalls === 1) {
        return json(route, {
          code: 1,
          errmsg: "留言列表加载失败了，请点击刷新重试～",
        });
      }
      return json(route, LIST_PAYLOAD);
    });

    await page.goto("/zh/support/messages?uid=7&ts=1751500000&sig=e2e-sig");

    const errorCard = page.getByTestId("seller-messages-error");
    await expect(errorCard).toBeVisible();
    await expect(errorCard).toContainText("留言列表加载失败了");

    await page.getByTestId("seller-messages-retry").click();
    await expect(page.getByTestId("seller-messages-card-101")).toBeVisible();
    await expect(errorCard).toHaveCount(0);
  });

  test("空列表 → 引导去商品页发起第一条留言", async ({ page }) => {
    await blockThirdParty(page);
    await page.route("**/api/support/seller-messages", (route) =>
      json(route, { code: 0, data: { list: [], page: 1, total: 0 } }),
    );

    await page.goto("/zh/support/messages?uid=7&ts=1751500000&sig=e2e-sig");

    const empty = page.getByTestId("seller-messages-empty");
    await expect(empty).toBeVisible();
    await expect(empty).toContainText("去商品页点「留言」");
  });

  test("新后端下发 can_transfer_human 字段：优先于 status_text 子串判断", async ({
    page,
  }) => {
    await blockThirdParty(page);
    await page.route("**/api/support/seller-messages", (route) =>
      json(route, LIST_PAYLOAD_NEW_BACKEND),
    );

    await page.goto("/zh/support/messages?uid=7&ts=1751500000&sig=e2e-sig");

    // can_transfer_human=true：即便 status_text 不含「可转人工」也要给入口
    await expect(
      page.getByTestId("seller-messages-human-kefu-105"),
    ).toBeVisible();
    // can_transfer_human=false：即便 closed 也不给入口
    await expect(
      page.getByTestId("seller-messages-human-kefu-106"),
    ).toHaveCount(0);
  });
});
