import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

const PROXY_FEE_REPLY =
  "代拍费用一般包含以下部分：商品本身价格、平台运费或日本国内运费、平台支付手续费、袋鼠君服务费、日本仓相关费用（如需打包等）、国际运费，以及目的地可能产生的关税或税费。每一单的具体金额以系统结算为准，费用明细会在下单和发货环节展示。";
const FIRST_TIME_NO_JAPANESE_REPLY =
  "不会日语完全没关系哦～\n\n我们小程序提供了简单的翻译功能，浏览商品时点击页面下方的【中文】按钮即可切换为中文查看。若仍有不理解的商品描述、卖家说明或注意事项，也可以随时联系人工客服帮您确认。\n\n第一次使用的话，购买流程很简单：\n1. 在小程序里提交你想买的商品（比如你现在看的这个 Mercari 商品）。\n2. 按系统显示的金额付款。\n3. 袋鼠君帮你在日本平台下单或出价。\n4. 商品到达日本仓库后，你在小程序申请国际发货。\n5. 等待收货就好啦。\n\n费用一般包括：商品价格、日本国内运费、服务费、国际运费，以及可能产生的关税。多件商品可以等一起到仓库后合并发货，更省钱哦！";

const QUICK_QUESTIONS = [
  {
    message: "我是第一次用，不会日语，应该怎么买？",
    action: "answered",
    reply: FIRST_TIME_NO_JAPANESE_REPLY,
    sourceId: "01_代购流程与下单.md",
  },
  {
    message: "代拍流程是什么？",
    action: "answered",
    reply:
      "代拍流程一般是：在小程序提交商品或订单并支付所需金额，袋鼠君按平台规则购买或竞拍；商品到达日本仓后，再由你提交国际发货。",
    sourceId: "01_代购流程与下单.md",
  },
  {
    message: "代拍费用如何计算？",
    action: "answered",
    reply: PROXY_FEE_REPLY,
    sourceId: "02_费用支付押金.md",
  },
  {
    message: "国际运费怎么查？",
    action: "answered",
    reply:
      "商品到达日本仓后，可以在提交国际发货时查看国际运费。具体金额以系统结算展示为准。",
    sourceId: "03_物流仓库海关.md",
  },
  {
    message: "商品多久能到仓库？",
    action: "answered",
    reply:
      "商品到仓时间会受平台处理、卖家发货和日本国内物流影响，暂时无法承诺准确时效，请以订单物流状态为准。",
    sourceId: "03_物流仓库海关.md",
  },
  {
    message: "押金怎么退？",
    action: "answered",
    reply:
      "押金退款需要先确认是否还有待支付订单、竞拍中订单、欠款、负余额或挂账。请先在小程序内提交押金退款申请；如需进一步核对或出现异常，会由客服按只读核验流程辅助初核。最终是否可退、退款金额和到账处理仍以人工及财务审核为准。",
    sourceId: "02_费用支付押金.md",
  },
  {
    message: "我要转人工客服",
    action: "transfer_human",
    reason: "quick_question_human_transfer",
    sourceId: "00_客服边界.md",
  },
] as const;

test("quick questions bypass Hermes and return deterministic actions and content", async (t) => {
  process.env.HERMES_BRIDGE_URL = "https://hermes.example.test";
  process.env.KANGAROO_AGENT_TOKEN = "test-token";
  delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;

  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("Hermes fetch must not be called for quick questions");
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    delete process.env.HERMES_BRIDGE_URL;
    delete process.env.KANGAROO_AGENT_TOKEN;
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
  });

  const { POST } = await import("./route");

  for (const quickQuestion of QUICK_QUESTIONS) {
    const request = new NextRequest("http://localhost/api/support/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: quickQuestion.message,
        language: "zh",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.data.action, quickQuestion.action);
    assert.equal(payload.data.answeredBy, "local-quick-reply");
    assert.ok(payload.data.sourceIds.includes(quickQuestion.sourceId));

    if (quickQuestion.action === "answered") {
      assert.equal(payload.data.type, "answered");
      assert.equal(payload.data.reply, quickQuestion.reply);
      assert.equal(payload.data.requiresTicket, false);
      assert.equal(payload.data.isHighRisk, false);
    } else {
      assert.equal(payload.data.type, "transfer_human");
      assert.equal(payload.data.reason, quickQuestion.reason);
      assert.equal(payload.data.fallback, "53kf");
      assert.equal(payload.data.requiresTicket, true);
      assert.equal(payload.data.isHighRisk, true);
    }
  }

  assert.equal(fetchCalls, 0);
});

test("quick question normalization remains exact and conservative", async () => {
  const { POST } = await import("./route");
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return Response.json({
      action: "answered",
      reply: "Bridge fallback",
    });
  };

  try {
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
    process.env.HERMES_BRIDGE_URL = "https://hermes.example.test";
    process.env.KANGAROO_AGENT_TOKEN = "test-token";

    const normalizedRequest = new NextRequest(
      "http://localhost/api/support/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "  代拍费用如何计算?  ",
          language: "zh",
        }),
      },
    );
    const normalizedPayload = await (await POST(normalizedRequest)).json();
    assert.equal(normalizedPayload.data.reply, PROXY_FEE_REPLY);

    const nonExactRequest = new NextRequest(
      "http://localhost/api/support/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "请问代拍费用如何计算？",
          language: "zh",
        }),
      },
    );
    const nonExactPayload = await (await POST(nonExactRequest)).json();
    assert.equal(nonExactPayload.data.reply, "Bridge fallback");
    assert.equal(fetchCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.HERMES_BRIDGE_URL;
    delete process.env.KANGAROO_AGENT_TOKEN;
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
  }
});

test("quick reply switch can disable deterministic answers for rollback", async () => {
  const { POST } = await import("./route");
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return Response.json({
      action: "answered",
      reply: "Bridge fallback",
    });
  };

  try {
    process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED = "false";
    process.env.HERMES_BRIDGE_URL = "https://hermes.example.test";
    process.env.KANGAROO_AGENT_TOKEN = "test-token";

    const request = new NextRequest("http://localhost/api/support/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "代拍费用如何计算？",
        language: "zh",
      }),
    });

    const payload = await (await POST(request)).json();
    assert.equal(payload.data.reply, "Bridge fallback");
    assert.equal(fetchCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.HERMES_BRIDGE_URL;
    delete process.env.KANGAROO_AGENT_TOKEN;
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
  }
});

test("personalized status quick questions with userId pass through to Hermes bridge", async () => {
  const { POST } = await import("./route");
  const originalFetch = globalThis.fetch;
  const capturedBridgeBodies: Array<Record<string, unknown>> = [];
  globalThis.fetch = async (_input, init) => {
    capturedBridgeBodies.push(JSON.parse(String(init?.body)));
    return Response.json({
      action: "answered",
      reply: "已为您核对入库状态。",
      source_ids: ["backend-selfservice:warehouse_status"],
      answered_by: "backend-order-status-selfservice",
    });
  };

  try {
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
    process.env.HERMES_BRIDGE_URL = "https://hermes.example.test";
    process.env.KANGAROO_AGENT_TOKEN = "test-token";

    const request = new NextRequest("http://localhost/api/support/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "我的东西入库了吗",
        language: "zh",
        userId: "4",
        externalSessionId: "uid4-smoke",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.data.action, "answered");
    assert.equal(payload.data.reply, "已为您核对入库状态。");
    assert.equal(payload.data.answeredBy, "backend-order-status-selfservice");
    assert.equal(capturedBridgeBodies.length, 1);
    assert.equal(capturedBridgeBodies[0].session_id, "uid4-smoke");
    assert.deepEqual(
      (capturedBridgeBodies[0].context as Record<string, unknown>).user_id,
      "4",
    );
    assert.equal(
      (capturedBridgeBodies[0].context as Record<string, unknown>)
        .context_user_id_state,
      "numeric",
    );
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.HERMES_BRIDGE_URL;
    delete process.env.KANGAROO_AGENT_TOKEN;
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
  }
});

test("personalized status with non-numeric userId fails closed before Hermes bridge", async () => {
  const { POST } = await import("./route");
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("Bridge fetch must not be called for non-numeric userId");
  };

  try {
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
    process.env.HERMES_BRIDGE_URL = "https://hermes.example.test";
    process.env.KANGAROO_AGENT_TOKEN = "test-token";

    const request = new NextRequest("http://localhost/api/support/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "我的东西入库了吗",
        language: "zh",
        userId: "openid-abc",
      }),
    });

    const payload = await (await POST(request)).json();

    assert.equal(payload.data.action, "answered");
    assert.equal(payload.data.reason, "quick_question_identity_required");
    assert.equal(payload.data.answeredBy, "local-quick-reply");
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.HERMES_BRIDGE_URL;
    delete process.env.KANGAROO_AGENT_TOKEN;
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
  }
});

test("personalized status quick questions without userId still use local quick reply", async () => {
  const { POST } = await import("./route");
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("Bridge fetch must not be called without userId");
  };

  try {
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
    process.env.HERMES_BRIDGE_URL = "https://hermes.example.test";
    process.env.KANGAROO_AGENT_TOKEN = "test-token";

    const request = new NextRequest("http://localhost/api/support/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "我的东西入库了吗",
        language: "zh",
      }),
    });

    const payload = await (await POST(request)).json();

    assert.equal(payload.data.action, "answered");
    assert.equal(payload.data.answeredBy, "local-quick-reply");
    assert.ok(payload.data.sourceIds.includes("03_物流仓库海关.md"));
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.HERMES_BRIDGE_URL;
    delete process.env.KANGAROO_AGENT_TOKEN;
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
  }
});

test("Hermes bridge diagnostics report context_user_id_state without logging raw identifiers", async () => {
  const { POST } = await import("./route");
  const originalFetch = globalThis.fetch;
  const originalConsoleInfo = console.info;
  const capturedBridgeBodies: Array<Record<string, unknown>> = [];
  const capturedLogs: Array<unknown[]> = [];

  globalThis.fetch = async (_input, init) => {
    capturedBridgeBodies.push(JSON.parse(String(init?.body)));
    return Response.json({
      action: "answered",
      reply: "Bridge fallback",
    });
  };
  console.info = (...args: unknown[]) => {
    capturedLogs.push(args);
  };

  try {
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
    process.env.HERMES_BRIDGE_URL = "https://hermes.example.test";
    process.env.KANGAROO_AGENT_TOKEN = "test-token";

    const cases = [
      {
        body: {},
        state: "missing",
        expectedUserId: undefined,
        expectedLength: undefined,
        expectedLastDigit: undefined,
      },
      {
        body: { user_id: "42" },
        state: "numeric",
        expectedUserId: "42",
        expectedLength: 2,
        expectedLastDigit: "2",
      },
      {
        body: { userId: "openid-abc" },
        state: "non_numeric",
        expectedUserId: undefined,
        expectedLength: 10,
        expectedLastDigit: undefined,
      },
    ] as const;

    for (const item of cases) {
      const request = new NextRequest("http://localhost/api/support/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "帮我看一下这个商品",
          language: "zh",
          externalSessionId: "session-secret-abcdef",
          sourceChannel: "mini_program_ai_webview",
          sourcePlatform: "mercari",
          ...item.body,
        }),
      });

      const payload = await (await POST(request)).json();
      assert.equal(payload.data.reply, "Bridge fallback");
    }

    assert.equal(capturedBridgeBodies.length, cases.length);
    assert.equal(capturedLogs.length, cases.length);

    cases.forEach((item, index) => {
      const bridgeContext = capturedBridgeBodies[index].context as Record<
        string,
        unknown
      >;
      assert.equal(bridgeContext.context_user_id_state, item.state);
      assert.equal(bridgeContext.user_id, item.expectedUserId);

      const [eventName, logFields] = capturedLogs[index] as [
        string,
        Record<string, unknown>,
      ];
      assert.equal(eventName, "support_chat_bridge_payload");
      assert.equal(logFields.context_user_id_state, item.state);
      assert.equal(logFields.source_channel, "mini_program_ai_webview");
      assert.equal(logFields.shop, "mercari");
      assert.equal(logFields.user_id_length, item.expectedLength);
      assert.equal(logFields.user_id_last_digit, item.expectedLastDigit);
      assert.match(String(logFields.timestamp), /^\d{4}-\d{2}-\d{2}T/);
      assert.equal(typeof logFields.session_hash_tail, "string");
      assert.equal(String(logFields.session_hash_tail).length, 6);
    });

    assert.doesNotMatch(
      JSON.stringify(capturedLogs),
      /session-secret-abcdef|openid-abc|"user_id":"42"/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.info = originalConsoleInfo;
    delete process.env.HERMES_BRIDGE_URL;
    delete process.env.KANGAROO_AGENT_TOKEN;
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
  }
});

test("general FAQ quick replies stay local even when userId is present", async () => {
  const { POST } = await import("./route");
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("Bridge fetch must not be called for general FAQ");
  };

  try {
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
    process.env.HERMES_BRIDGE_URL = "https://hermes.example.test";
    process.env.KANGAROO_AGENT_TOKEN = "test-token";

    for (const userId of [undefined, "4"]) {
      const request = new NextRequest("http://localhost/api/support/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "国际运费怎么查？",
          language: "zh",
          ...(userId ? { userId } : {}),
        }),
      });

      const payload = await (await POST(request)).json();
      assert.equal(payload.data.action, "answered");
      assert.equal(payload.data.answeredBy, "local-quick-reply");
      assert.match(payload.data.reply, /提交国际发货时查看国际运费/);
    }

    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.HERMES_BRIDGE_URL;
    delete process.env.KANGAROO_AGENT_TOKEN;
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
  }
});

test("Hermes bridge payload includes 2026-06 storage, photo, box, and exchange-rate fee standards", async () => {
  process.env.HERMES_BRIDGE_URL = "https://hermes.example.test";
  process.env.KANGAROO_AGENT_TOKEN = "test-token";
  delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;

  const { POST } = await import("./route");
  const originalFetch = globalThis.fetch;
  let capturedBridgeBody: Record<string, unknown> | null = null;
  globalThis.fetch = async (_input, init) => {
    capturedBridgeBody = JSON.parse(String(init?.body));
    return Response.json({
      action: "answered",
      reply: "仓储收费以 2026-06 标准为准。",
      source_ids: ["kb-storage-001"],
    });
  };

  try {
    const request = new NextRequest("http://localhost/api/support/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "包裹在仓库可以免费放多久？拍照和纸箱怎么收费？",
        language: "zh",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.data.action, "answered");

    const bridgeBody = capturedBridgeBody as {
      knowledge_base: Array<{
        id: string;
        text: string;
      }>;
    } | null;
    assert.ok(bridgeBody);
    const knowledgeBase = bridgeBody.knowledge_base as Array<{
      id: string;
      text: string;
    }>;
    const storage = knowledgeBase.find(
      (entry) => entry.id === "kb-storage-001",
    );
    const fee = knowledgeBase.find((entry) => entry.id === "kb-fee-001");

    assert.ok(storage);
    assert.match(storage.text, /30 days for non-members and Gold members/);
    assert.match(storage.text, /60 days for Platinum and Diamond members/);
    assert.match(storage.text, /each item\/package is charged 100 JPY per day/);
    assert.match(storage.text, /100 JPY per item or 200 JPY per box/);
    assert.match(storage.text, /300 JPY \(100size\)/);
    assert.match(storage.text, /400 JPY \(120size\)/);
    assert.match(storage.text, /400 JPY \(140size\)/);
    assert.match(storage.text, /1000 JPY \(170size\)/);
    assert.doesNotMatch(storage.text, /5\s*CNY|5\s*元|350 JPY/);

    assert.ok(fee);
    assert.match(
      fee.text,
      /\+0\.0025 daytime \/ \+0\.0023 nighttime for ALL users/,
    );
    assert.match(
      fee.text,
      /official Japan EMS fee x \(partner rate \+ 0\.003\)/,
    );
    assert.doesNotMatch(fee.text, /\+0\.025|0\.006/);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.HERMES_BRIDGE_URL;
    delete process.env.KANGAROO_AGENT_TOKEN;
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
  }
});

test("short storage, photo, and box questions pass business guardrail and reach storage KB", async () => {
  process.env.HERMES_BRIDGE_URL = "https://hermes.example.test";
  process.env.KANGAROO_AGENT_TOKEN = "test-token";
  delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;

  const { POST } = await import("./route");
  const originalFetch = globalThis.fetch;
  const capturedBridgeBodies: Array<Record<string, unknown>> = [];
  globalThis.fetch = async (_input, init) => {
    capturedBridgeBodies.push(JSON.parse(String(init?.body)));
    return Response.json({
      action: "answered",
      reply: "仓储收费以 kb-storage-001 为准。",
      source_ids: ["kb-storage-001"],
      answered_by: "m4-hermes-customer-support",
    });
  };

  try {
    const shortQuestions = [
      "仓储超期怎么收费？",
      "拍照和纸箱怎么收费？",
      "打包合箱转运怎么收费？",
    ];

    for (const message of shortQuestions) {
      const request = new NextRequest("http://localhost/api/support/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          language: "zh",
        }),
      });

      const response = await POST(request);
      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(payload.data.action, "answered");
      assert.deepEqual(payload.data.sourceIds, ["kb-storage-001"]);
      assert.notEqual(payload.data.reason, "guardrail_out_of_business_scope");
    }

    assert.equal(capturedBridgeBodies.length, shortQuestions.length);
    for (const bridgeBody of capturedBridgeBodies) {
      const knowledgeBase = bridgeBody.knowledge_base as Array<{
        id: string;
        text: string;
      }>;
      assert.ok(knowledgeBase.some((entry) => entry.id === "kb-storage-001"));
    }
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.HERMES_BRIDGE_URL;
    delete process.env.KANGAROO_AGENT_TOKEN;
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
  }
});

test("unrelated short questions remain blocked by business guardrail", async () => {
  process.env.HERMES_BRIDGE_URL = "https://hermes.example.test";
  process.env.KANGAROO_AGENT_TOKEN = "test-token";
  delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;

  const { POST } = await import("./route");
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("Bridge fetch must not be called for unrelated questions");
  };

  try {
    const unrelatedQuestions = ["今天北京天气怎么样？", "帮我写一首诗"];

    for (const message of unrelatedQuestions) {
      const request = new NextRequest("http://localhost/api/support/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          language: "zh",
        }),
      });

      const response = await POST(request);
      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(payload.data.reason, "guardrail_out_of_business_scope");
      assert.deepEqual(payload.data.sourceIds, [
        "local-customer-service-guardrail",
      ]);
    }

    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.HERMES_BRIDGE_URL;
    delete process.env.KANGAROO_AGENT_TOKEN;
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
  }
});

test("customer-facing bridge replies do not expose internal agent names", async () => {
  const { POST } = await import("./route");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return Response.json({
      action: "answered",
      reply: "Hermes 离线，请稍后再试。",
    });
  };

  try {
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
    process.env.HERMES_BRIDGE_URL = "https://hermes.example.test";
    process.env.KANGAROO_AGENT_TOKEN = "test-token";

    const request = new NextRequest("http://localhost/api/support/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "帮我看一下这个商品",
        language: "zh",
      }),
    });

    const payload = await (await POST(request)).json();
    assert.equal(payload.data.reply, "袋鼠酱下线，请稍后再试。");
    assert.doesNotMatch(payload.data.reply, /Hermes|Claude|GPT|模型/);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.HERMES_BRIDGE_URL;
    delete process.env.KANGAROO_AGENT_TOKEN;
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
  }
});

test("Hermes bridge answered responses pass through order_ref unchanged", async () => {
  const originalFetch = globalThis.fetch;
  const orderRef = {
    order_id: "89969",
    goods_name: "【...】Apple Mac mini m4 16g 256gssd",
    amount: "97600.00",
    amount_rmb: "4471.00",
  };

  globalThis.fetch = async () => {
    return Response.json({
      action: "answered",
      reply: "我帮您查到这笔订单了。",
      source_ids: ["backend-selfservice:order_lookup"],
      answered_by: "backend-order-status-selfservice",
      order_ref: orderRef,
    });
  };

  try {
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
    process.env.HERMES_BRIDGE_URL = "https://hermes.example.test";
    process.env.KANGAROO_AGENT_TOKEN = "test-token";

    const { POST } = await import("./route");

    const request = new NextRequest("http://localhost/api/support/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "帮我看一下这个订单",
        language: "zh",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.data.action, "answered");
    assert.deepEqual(payload.data.order_ref, orderRef);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.HERMES_BRIDGE_URL;
    delete process.env.KANGAROO_AGENT_TOKEN;
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
  }
});

test("Hermes bridge timeout degrades to human transfer without exposing internals", async () => {
  const { POST } = await import("./route");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) =>
    new Promise((_resolve, reject) => {
      const signal = (init as RequestInit | undefined)?.signal;
      signal?.addEventListener("abort", () => {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      });
      if (signal?.aborted) {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      }
    });

  try {
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
    process.env.HERMES_BRIDGE_URL = "https://hermes.example.test";
    process.env.KANGAROO_AGENT_TOKEN = "test-token";
    process.env.HERMES_BRIDGE_TIMEOUT_MS = "50";

    const request = new NextRequest("http://localhost/api/support/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "帮我看一下这个商品",
        language: "zh",
      }),
    });

    const payload = await (await POST(request)).json();
    assert.equal(payload.data.action, "transfer_human");
    assert.equal(payload.data.fallback, "53kf");
    assert.equal(payload.data.reason, "bridge_timeout");
    assert.doesNotMatch(JSON.stringify(payload), /Hermes|Claude|GPT|模型/);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.HERMES_BRIDGE_URL;
    delete process.env.KANGAROO_AGENT_TOKEN;
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
    delete process.env.HERMES_BRIDGE_TIMEOUT_MS;
  }
});

test("deposit refund quick reply describes process without claiming verification result", async () => {
  const { POST } = await import("./route");
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return Response.json({
      action: "answered",
      reply: "Bridge fallback",
    });
  };

  try {
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
    process.env.HERMES_BRIDGE_URL = "https://hermes.example.test";
    process.env.KANGAROO_AGENT_TOKEN = "test-token";

    const quickRequest = new NextRequest("http://localhost/api/support/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "押金怎么退？",
        language: "zh",
      }),
    });

    const quickPayload = await (await POST(quickRequest)).json();
    const reply = quickPayload.data.reply as string;
    assert.match(reply, /小程序内提交押金退款申请/);
    assert.match(
      reply,
      /最终是否可退、退款金额和到账处理仍以人工及财务审核为准/,
    );
    assert.doesNotMatch(reply, /符合条件|可以退|会退给您/);
    assert.equal(fetchCalls, 0);

    const followUpRequest = new NextRequest(
      "http://localhost/api/support/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "帮我查一下押金退款",
          language: "zh",
        }),
      },
    );

    const followUpPayload = await (await POST(followUpRequest)).json();
    assert.equal(followUpPayload.data.reply, "Bridge fallback");
    assert.equal(fetchCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.HERMES_BRIDGE_URL;
    delete process.env.KANGAROO_AGENT_TOKEN;
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
  }
});

test("short auction bid questions pass business guardrail and reach auction bid KB", async () => {
  process.env.HERMES_BRIDGE_URL = "https://hermes.example.test";
  process.env.KANGAROO_AGENT_TOKEN = "test-token";
  delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;

  const { POST } = await import("./route");
  const originalFetch = globalThis.fetch;
  const capturedBridgeBodies: Array<Record<string, unknown>> = [];
  globalThis.fetch = async (_input, init) => {
    capturedBridgeBodies.push(JSON.parse(String(init?.body)));
    return Response.json({
      action: "answered",
      reply: "竞拍出价问题以 kb-auction-001 为准。",
      source_ids: ["kb-auction-001"],
      answered_by: "m4-hermes-customer-support",
    });
  };

  try {
    const shortQuestions = [
      "为什么出不了价？",
      "出价失败怎么回事？",
      "竞拍怎么参加？",
      "流拍了怎么办？",
      "还有多久截拍？",
    ];

    for (const message of shortQuestions) {
      const request = new NextRequest("http://localhost/api/support/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          language: "zh",
        }),
      });

      const response = await POST(request);
      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(payload.data.action, "answered");
      assert.deepEqual(payload.data.sourceIds, ["kb-auction-001"]);
      assert.notEqual(payload.data.reason, "guardrail_out_of_business_scope");
    }

    assert.equal(capturedBridgeBodies.length, shortQuestions.length);
    for (const bridgeBody of capturedBridgeBodies) {
      const knowledgeBase = bridgeBody.knowledge_base as Array<{
        id: string;
        text: string;
      }>;
      const auctionBid = knowledgeBase.find(
        (entry) => entry.id === "kb-auction-001",
      );
      assert.ok(auctionBid);
      assert.match(auctionBid.text, /Japan-China time difference/);
      assert.match(auctionBid.text, /only shows up when a bid is attempted/);
      assert.match(
        auctionBid.text,
        /higher than the user's own previous highest bid/,
      );
      assert.match(auctionBid.text, /transfer to human support to verify/);
    }
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.HERMES_BRIDGE_URL;
    delete process.env.KANGAROO_AGENT_TOKEN;
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
  }
});

test("buy-it-now question passes guardrail and auction rules KB locks 即決 and maximum-bid mechanism", async () => {
  process.env.HERMES_BRIDGE_URL = "https://hermes.example.test";
  process.env.KANGAROO_AGENT_TOKEN = "test-token";
  delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;

  const { POST } = await import("./route");
  const originalFetch = globalThis.fetch;
  let capturedBridgeBody: Record<string, unknown> | null = null;
  globalThis.fetch = async (_input, init) => {
    capturedBridgeBody = JSON.parse(String(init?.body));
    return Response.json({
      action: "answered",
      reply: "即决与竞拍规则以 kb-auction-002 为准。",
      source_ids: ["kb-auction-002"],
      answered_by: "m4-hermes-customer-support",
    });
  };

  try {
    const request = new NextRequest("http://localhost/api/support/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "即决是什么意思？",
        language: "zh",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.data.action, "answered");
    assert.deepEqual(payload.data.sourceIds, ["kb-auction-002"]);
    assert.notEqual(payload.data.reason, "guardrail_out_of_business_scope");

    const bridgeBody = capturedBridgeBody as {
      knowledge_base: Array<{
        id: string;
        text: string;
      }>;
    } | null;
    assert.ok(bridgeBody);
    const auctionRules = bridgeBody.knowledge_base.find(
      (entry) => entry.id === "kb-auction-002",
    );
    assert.ok(auctionRules);
    assert.match(auctionRules.text, /即決価格/);
    assert.match(auctionRules.text, /現在価格/);
    assert.match(auctionRules.text, /highest bidder wins/);
    assert.match(
      auctionRules.text,
      /with no competing bidders the price stays unchanged/,
    );
    assert.match(
      auctionRules.text,
      /greater than or equal to the seller's buy-it-now price/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.HERMES_BRIDGE_URL;
    delete process.env.KANGAROO_AGENT_TOKEN;
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
  }
});

test("deposit refund question reaches auction deposit KB and locks the 1 CNY = 200 JPY ratio", async () => {
  process.env.HERMES_BRIDGE_URL = "https://hermes.example.test";
  process.env.KANGAROO_AGENT_TOKEN = "test-token";
  // Disable the exact-match quick reply so "押金怎么退？" exercises the bridge KB path.
  process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED = "false";

  const { POST } = await import("./route");
  const originalFetch = globalThis.fetch;
  let capturedBridgeBody: Record<string, unknown> | null = null;
  globalThis.fetch = async (_input, init) => {
    capturedBridgeBody = JSON.parse(String(init?.body));
    return Response.json({
      action: "answered",
      reply: "押金规则以 kb-auction-003 为准。",
      source_ids: ["kb-auction-003"],
      answered_by: "m4-hermes-customer-support",
    });
  };

  try {
    const request = new NextRequest("http://localhost/api/support/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "押金怎么退？",
        language: "zh",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.data.action, "answered");
    assert.deepEqual(payload.data.sourceIds, ["kb-auction-003"]);

    const bridgeBody = capturedBridgeBody as {
      knowledge_base: Array<{
        id: string;
        text: string;
      }>;
    } | null;
    assert.ok(bridgeBody);
    const knowledgeBase = bridgeBody.knowledge_base;
    const auctionDeposit = knowledgeBase.find(
      (entry) => entry.id === "kb-auction-003",
    );
    assert.ok(auctionDeposit);
    assert.match(auctionDeposit.text, /1 CNY = 200 JPY/);
    assert.match(auctionDeposit.text, /1 元 = 200 日元/);
    assert.match(auctionDeposit.text, /cannot be used to offset the item cost/);
    assert.match(auctionDeposit.text, /original payment channel/);

    // Guard against an old/wrong deposit ratio flowing back into any KB entry.
    for (const entry of knowledgeBase) {
      assert.doesNotMatch(entry.text, /1 ?元\s*[=：:]\s*(?!200)\d/u);
      assert.doesNotMatch(entry.text, /1 ?CNY\s*=\s*(?!200)\d/u);
    }
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.HERMES_BRIDGE_URL;
    delete process.env.KANGAROO_AGENT_TOKEN;
    delete process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED;
  }
});
