import { expect, Page, Route, test } from "@playwright/test";
import { signInForE2E } from "./mocks";

type MockMessage = {
  id: string;
  role: "visitor" | "bot" | "support";
  content: string;
  intent: string;
  createdAt: string;
};

type MockConversation = {
  id: string;
  visitorName: string;
  visitorEmail: string;
  site: string;
  language: string;
  status: "pending_human" | "human_active" | "closed";
  sourceChannel: string;
  externalSessionId: string;
  sourcePage: string;
  sourceGoodsId: string;
  sourcePlatform: string;
  assignedAdminId: string | null;
  handoffReason: string | null;
  lastMessageAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  messages: MockMessage[];
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function postJson(route: Route): Record<string, unknown> {
  try {
    const data = route.request().postDataJSON();
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

async function installCustomerServiceMocks(page: Page) {
  const now = "2026-06-05T10:00:00.000Z";
  const conversation: MockConversation = {
    id: "conversation-smoke",
    visitorName: "小程序客户",
    visitorEmail: "mini@example.com",
    site: "kangaroo-japan",
    language: "zh",
    status: "pending_human",
    sourceChannel: "mini_program_ai_webview",
    externalSessionId: "session-smoke",
    sourcePage: "/pages/bundle/kefu/kefu?gid=m97035025426",
    sourceGoodsId: "m97035025426",
    sourcePlatform: "mercari",
    assignedAdminId: null,
    handoffReason: "customer_requested_human",
    lastMessageAt: now,
    closedAt: null,
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: "message-1",
        role: "visitor",
        content: "我要找人工客服",
        intent: "human_handoff",
        createdAt: now,
      },
      {
        id: "message-2",
        role: "bot",
        content: "已为您转接人工客服。",
        intent: "human_handoff",
        createdAt: "2026-06-05T10:00:01.000Z",
      },
    ],
  };

  await page.route("https://embed.tawk.to/**", (route) => route.abort());

  await page.route("**/api/support/chat", async (route) => {
    const body = postJson(route);
    conversation.messages.push({
      id: `message-${conversation.messages.length + 1}`,
      role: "visitor",
      content: String(body.message || "hello"),
      intent: "human_handoff",
      createdAt: "2026-06-05T10:00:02.000Z",
    });
    return json(route, {
      code: 0,
      data: {
        conversationId: conversation.id,
        reply: "已为您转接人工客服，请稍候。",
        intent: "human_handoff",
        requiresTicket: true,
        isHighRisk: false,
      },
    });
  });

  await page.route(
    "**/api/support/conversations/conversation-smoke/messages**",
    async (route) => {
      if (route.request().method() === "POST") {
        const body = postJson(route);
        conversation.messages.push({
          id: `message-${conversation.messages.length + 1}`,
          role: "visitor",
          content: String(body.content || ""),
          intent: "human_handoff",
          createdAt: "2026-06-05T10:00:04.000Z",
        });
        return json(route, {
          code: 0,
          data: {
            conversationId: conversation.id,
            accepted: true,
            queuedForHuman: true,
            autoReply: null,
            status: conversation.status,
          },
        });
      }

      return json(route, {
        code: 0,
        data: {
          conversationId: conversation.id,
          status: conversation.status,
          messages: conversation.messages,
          polling: { recommendedIntervalSeconds: 3 },
        },
      });
    },
  );

  const handleAdminConversationRoute = async (route: Route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const pathname = url.pathname;

    if (method === "GET" && pathname.endsWith("/support/admin/conversations")) {
      return json(route, {
        success: true,
        data: { data: [conversation], total: 1 },
      });
    }

    if (method === "GET" && pathname.endsWith(`/${conversation.id}`)) {
      return json(route, { success: true, data: conversation });
    }

    if (method === "POST" && pathname.endsWith(`/${conversation.id}/claim`)) {
      conversation.status = "human_active";
      conversation.assignedAdminId = "admin-e2e";
      return json(route, {
        success: true,
        data: { conversation, auditRecorded: true },
      });
    }

    if (
      method === "POST" &&
      pathname.endsWith(`/${conversation.id}/messages`)
    ) {
      conversation.status = "human_active";
      conversation.messages.push({
        id: `message-${conversation.messages.length + 1}`,
        role: "support",
        content: "人工客服已接手，我们会按商品页面信息继续核对。",
        intent: "human_handoff",
        createdAt: "2026-06-05T10:00:03.000Z",
      });
      return json(route, {
        success: true,
        data: {
          message: conversation.messages.at(-1),
          conversation,
          customerDelivery: {
            mode: "polling",
            customerVisible: true,
            activePushSent: false,
          },
        },
      });
    }

    if (method === "POST" && pathname.endsWith(`/${conversation.id}/close`)) {
      conversation.status = "closed";
      conversation.closedAt = "2026-06-05T10:05:00.000Z";
      return json(route, {
        success: true,
        data: { conversation, auditRecorded: true },
      });
    }

    return json(
      route,
      { success: false, error: { message: "not mocked" } },
      404,
    );
  };

  await page.route(
    "**/api/backend/support/admin/conversations**",
    handleAdminConversationRoute,
  );
  await page.route(
    "**/__e2e-api/support/admin/conversations**",
    handleAdminConversationRoute,
  );
}

test.describe("customer service replacement UI smoke", () => {
  test("admin workbench can claim and reply, H5 polling shows human message", async ({
    page,
  }) => {
    await signInForE2E(page, "admin");
    await installCustomerServiceMocks(page);

    await page.goto("/zh/admin/kefu");

    await expect(
      page.getByRole("heading", { name: "小程序客服工作台" }),
    ).toBeVisible();
    await expect(page.getByText("m97035025426").first()).toBeVisible();
    await page.getByRole("button", { name: "接手会话" }).click();
    await expect(page.getByText("已接手会话")).toBeVisible();

    await page
      .getByPlaceholder(/输入人工回复/)
      .fill("人工客服已接手，我们会按商品页面信息继续核对。");
    await page.getByRole("button", { name: "发送回复" }).click();
    await expect(page.getByText("客户 H5 可通过轮询看到")).toBeVisible();

    await page.goto("/zh/support/h5?conversation_id=conversation-smoke");
    await expect(page.getByText("人工客服").first()).toBeVisible();
    await expect(
      page.getByText("人工客服已接手，我们会按商品页面信息继续核对。"),
    ).toBeVisible();

    await page.getByPlaceholder("请输入问题").fill("我刚刚又补充了一条信息");
    await page.getByRole("button", { name: "发送" }).click();
    await expect(page.getByText("我刚刚又补充了一条信息")).toBeVisible();
    await expect(
      page.getByText("人工客服已接手，我们会按商品页面信息继续核对。"),
    ).toBeVisible();
  });

  test("H5 non-WebView contact button opens configured 53KF web chat", async ({
    page,
  }) => {
    await installCustomerServiceMocks(page);
    await page.addInitScript(() => {
      const openCalls: Array<{
        features?: string;
        target?: string;
        url?: string;
      }> = [];
      Object.defineProperty(window, "__kf53OpenCalls", {
        value: openCalls,
      });
      window.open = (url, target, features) => {
        openCalls.push({
          features,
          target,
          url: typeof url === "string" ? url : url?.toString(),
        });
        return null;
      };
    });

    await page.goto("/zh/support/h5?type=transfer_human&fallback=53kf");
    await expect(page.getByTestId("human-transfer-card")).toBeVisible();
    await expect(
      page.getByText("普通 H5 环境会打开网页人工客服窗口"),
    ).toBeVisible();

    await page.getByRole("button", { name: "联系人工客服" }).click();

    await expect
      .poll(() =>
        page.evaluate(() => {
          return (
            window as Window & {
              __kf53OpenCalls?: Array<{
                features?: string;
                target?: string;
                url?: string;
              }>;
            }
          ).__kf53OpenCalls?.[0];
        }),
      )
      .toEqual({
        features: "noopener,noreferrer",
        target: "_blank",
        url: "https://kf53.example.test/chat",
      });
  });
});
