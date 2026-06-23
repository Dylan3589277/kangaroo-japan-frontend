import { createServer, Server } from "node:http";

import { expect, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// Relay-layer regression guard for the order-list card.
//
// WHY THIS EXISTS (separate from support-order-list.spec.ts):
// support-order-list.spec.ts mocks `**/api/support/chat` at the BROWSER level,
// so the request is fulfilled before it ever reaches the Next route handler.
// That mock therefore cannot catch a relay bug where route.ts's callHermesBridge
// forwards `reply` but silently drops the top-level `list` field (which is exactly
// the bug this card fixes).
//
// This spec does NOT mock /api/support/chat. Instead it stands up a local stub
// Hermes bridge and points the Next dev server at it via HERMES_BRIDGE_URL
// (injected in playwright.config.ts webServer env). A real request now flows:
//   browser → Next route.ts (callHermesBridge) → stub bridge (returns top-level
//   `list`) → back through route.ts → browser → list card renders.
// If the relay stops forwarding `list`, the card disappears and this test fails.
// ---------------------------------------------------------------------------

const BRIDGE_PORT = Number(process.env.E2E_HERMES_BRIDGE_PORT || 3198);

const LIST_PAYLOAD = {
  action: "answered",
  reply: "以下是您已购买、尚未到日本仓的订单（点订单看已发货/未发货）：",
  source_ids: ["backend-selfservice:order_list"],
  answered_by: "backend-order-status-selfservice",
  // Top-level `list` — the field the relay must forward to data.list.
  list: {
    stage: "warehouse",
    title: "已购买·尚未到日本仓",
    items: [
      {
        order_id: "RLY001",
        title: "中继回归商品A",
        status_txt: "待入库",
        amount_rmb: 128,
        cover: "",
        detail_target: "order",
      },
      {
        order_id: "RLY002",
        title: "中继回归商品B",
        status_txt: "已发货",
        amount_rmb: 256,
        cover: "",
        detail_target: "order",
      },
    ],
    page: 1,
    total_pages: 1,
    has_prev: false,
    has_next: false,
  },
};

let bridge: Server;

test.beforeAll(async () => {
  // Catch-all stub bridge: replies to any path with a top-level `list`.
  bridge = createServer((req, res) => {
    // Drain the request body (we don't need its content) then reply.
    req.on("data", () => {});
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(LIST_PAYLOAD));
    });
  });
  await new Promise<void>((resolve) =>
    bridge.listen(BRIDGE_PORT, "127.0.0.1", resolve),
  );
});

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    bridge.close((err) => (err ? reject(err) : resolve())),
  );
});

test.describe("support H5 order-list card — relay layer", () => {
  test("bridge top-level list flows through route.ts to data.list and renders", async ({
    page,
  }) => {
    // Only abort 3rd-party widgets; deliberately DO NOT mock /api/support/chat,
    // so the request flows through the real Next route handler + relay.
    await page.route("https://embed.tawk.to/**", (route) => route.abort());
    await page.route("https://res.wx.qq.com/**", (route) => route.abort());
    await page.route("**/api/support/conversations/**/messages", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ code: 0, data: { messages: [] } }),
      }),
    );

    // uid=4 (numeric) + a warehouse personalized-status question ("入库") so the
    // POST handler bypasses the local guardrail and reaches callHermesBridge —
    // the relay path under test. The stub bridge then returns a top-level `list`.
    await page.goto("/zh/support/h5?shop=mercari&uid=4");
    await page.getByPlaceholder("请输入问题").fill("我的东西入库了吗");
    await page.getByRole("button", { name: "发送" }).click();

    const card = page.getByTestId("support-list-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("已购买·尚未到日本仓")).toBeVisible();
    await expect(card.getByText("中继回归商品A")).toBeVisible();
    await expect(card.getByText("中继回归商品B")).toBeVisible();
    await expect(card.getByText("¥128")).toBeVisible();
  });
});
