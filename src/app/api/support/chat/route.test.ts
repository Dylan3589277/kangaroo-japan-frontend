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
    assert.match(reply, /最终是否可退、退款金额和到账处理仍以人工及财务审核为准/);
    assert.doesNotMatch(reply, /符合条件|可以退|会退给您/);
    assert.equal(fetchCalls, 0);

    const followUpRequest = new NextRequest("http://localhost/api/support/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "帮我查一下押金退款",
        language: "zh",
      }),
    });

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

