import { createHash } from "node:crypto";

import { unstable_rethrow } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

import { parseRequestJsonObject } from "@/lib/request-json";
import { getReviewMode } from "@/lib/review-mode";

const SUPPORT_API_BASE_URL =
  process.env.SUPPORT_API_BASE_URL ||
  "https://kangaroo-japan-backend.vercel.app/api/v1";
const HERMES_BRIDGE_URL =
  process.env.HERMES_BRIDGE_URL ||
  process.env.CUSTOMER_SERVICE_BRIDGE_URL ||
  "";
const HERMES_BRIDGE_TOKEN =
  process.env.KANGAROO_AGENT_TOKEN || process.env.HERMES_BRIDGE_TOKEN || "";
const HERMES_BRIDGE_TIMEOUT_MS = 28_000;

// 2026-07-26 花哥拍板：顾客主动要求转人工时，回"我有点忙"不贴题也不实诚（真实对话
// 里顾客点了转人工还换会话重试）。改为直接应答。与 bridge.py 的
// EXPLICIT_HUMAN_TRANSFER_REPLY 保持同一段话术（点按钮 / 打字问 两条路径体验一致）。
const HUMAN_TRANSFER_REPLY = "好的，这就为您转接人工客服～";
const QUICK_REPLY_SOURCE_ID = "local-quick-reply";
const FIRST_TIME_NO_JAPANESE_REPLY =
  "不会日语完全没关系哦～\n\n我们小程序提供了简单的翻译功能，浏览商品时点击页面下方的【中文】按钮即可切换为中文查看。若仍有不理解的商品描述、卖家说明或注意事项，也可以随时联系人工客服帮您确认。\n\n第一次使用的话，购买流程很简单：\n1. 在小程序里提交你想买的商品（比如你现在看的这个 Mercari 商品）。\n2. 按系统显示的金额付款。\n3. 袋鼠君帮你在日本平台下单或出价。\n4. 商品到达日本仓库后，你在小程序申请国际发货。\n5. 等待收货就好啦。\n\n费用一般包括：商品价格、日本国内运费、服务费、国际运费，以及可能产生的关税。多件商品可以等一起到仓库后合并发货，更省钱哦！";
const PROXY_FEE_REPLY =
  "代购费用一般包含以下部分：商品本身价格、平台运费或日本国内运费、平台支付手续费、袋鼠君服务费、日本仓相关费用（如需打包等）、国际运费，以及目的地可能产生的关税或税费。每一单的具体金额以系统结算为准，费用明细会在下单和发货环节展示。";

type QuickReply =
  | {
      action: "answered";
      reply: string;
      sourceId: string;
      sourceVersion: string;
    }
  | {
      action: "transfer_human";
      reason: string;
      sourceId: string;
      sourceVersion: string;
    };

function isQuickReplyEnabled() {
  return process.env.CUSTOMER_SERVICE_QUICK_REPLY_ENABLED !== "false";
}

const QUICK_REPLIES = new Map<string, QuickReply>([
  // source: 01_代购流程与下单.md + support translation UX, customer-service-kb-v0.1-20260601
  [
    normalizeQuickQuestion("我是第一次用，不会日语，应该怎么买？"),
    {
      action: "answered",
      sourceId: "01_代购流程与下单.md",
      sourceVersion: "customer-service-kb-v0.1-20260601",
      reply: FIRST_TIME_NO_JAPANESE_REPLY,
    },
  ],
  // source: 01_代购流程与下单.md, customer-service-kb-v0.1-20260601
  [
    normalizeQuickQuestion("代购流程是什么？"),
    {
      action: "answered",
      sourceId: "01_代购流程与下单.md",
      sourceVersion: "customer-service-kb-v0.1-20260601",
      reply:
        "代购流程一般是：在小程序提交商品或订单并支付所需金额，袋鼠君按平台规则购买或竞拍；商品到达日本仓后，再由你提交国际发货。",
    },
  ],
  // source: 02_费用支付押金.md v0.4, 2026-06-10
  [
    normalizeQuickQuestion("代购费用如何计算？"),
    {
      action: "answered",
      sourceId: "02_费用支付押金.md",
      sourceVersion: "v0.4-20260610",
      reply: PROXY_FEE_REPLY,
    },
  ],
  // source: 03_物流仓库海关.md, customer-service-kb-v0.1-20260601
  [
    normalizeQuickQuestion("国际运费怎么查？"),
    {
      action: "answered",
      sourceId: "03_物流仓库海关.md",
      sourceVersion: "customer-service-kb-v0.1-20260601",
      reply:
        "商品到达日本仓后，可以在提交国际发货时查看国际运费。具体金额以系统结算展示为准。",
    },
  ],
  // source: 03_物流仓库海关.md, customer-service-kb-v0.1-20260601
  [
    normalizeQuickQuestion("商品多久能到仓库？"),
    {
      action: "answered",
      sourceId: "03_物流仓库海关.md",
      sourceVersion: "customer-service-kb-v0.1-20260601",
      reply:
        "商品到仓时间会受平台处理、卖家发货和日本国内物流影响，暂时无法承诺准确时效，请以订单物流状态为准。",
    },
  ],
  [
    normalizeQuickQuestion("入库了吗？"),
    {
      action: "answered",
      sourceId: "03_物流仓库海关.md",
      sourceVersion: "customer-service-kb-v0.1-20260601",
      reply:
        "商品是否入库需要以小程序订单状态为准。若你已经登录并从订单入口进入客服，袋鼠酱可以继续帮你核对；未登录时请联系人工客服确认。",
    },
  ],
  [
    normalizeQuickQuestion("到哪了？"),
    {
      action: "answered",
      sourceId: "03_物流仓库海关.md",
      sourceVersion: "customer-service-kb-v0.1-20260601",
      reply:
        "订单当前状态需要以小程序里的订单和物流信息为准。若你已经登录并从订单入口进入客服，袋鼠酱可以继续帮你核对；未登录时请联系人工客服确认。",
    },
  ],
  // source: 02_费用支付押金.md v0.4, 2026-06-10
  [
    normalizeQuickQuestion("押金怎么退？"),
    {
      action: "answered",
      sourceId: "02_费用支付押金.md",
      sourceVersion: "v0.4-20260610",
      reply:
        "押金退款需要先确认是否还有待支付订单、竞拍中订单、欠款、负余额或挂账。请先在小程序内提交押金退款申请；如需进一步核对或出现异常，会由客服按只读核验流程辅助初核。最终是否可退、退款金额和到账处理仍以人工及财务审核为准。",
    },
  ],
  [
    normalizeQuickQuestion("押金退了吗？"),
    {
      action: "answered",
      sourceId: "02_费用支付押金.md",
      sourceVersion: "v0.4-20260610",
      reply:
        "押金退款状态需要结合你的登录身份和押金记录核对。未登录或无法确认身份时，会转人工客服继续处理。",
    },
  ],
  // source: 00_客服边界.md, customer-service-kb-v0.1-20260601
  [
    normalizeQuickQuestion("我要转人工客服"),
    {
      action: "transfer_human",
      reason: "quick_question_human_transfer",
      sourceId: "00_客服边界.md",
      sourceVersion: "customer-service-kb-v0.1-20260601",
    },
  ],
]);

const PERSONALIZED_STATUS_QUICK_QUESTIONS = new Set([
  normalizeQuickQuestion("商品多久能到仓库？"),
  normalizeQuickQuestion("入库了吗？"),
  normalizeQuickQuestion("到哪了？"),
  normalizeQuickQuestion("押金怎么退？"),
  normalizeQuickQuestion("押金退了吗？"),
]);

type PersonalizedStatusKind = "warehouse" | "tracking" | "deposit";
type ContextUserIdState = "missing" | "numeric" | "non_numeric";

const NUMERIC_USER_ID_PATTERN = /^\d+$/;

// 【客服话术知识库归属：bridge，不在前端】
// 2026-08-06 移除原本内联在此的 CUSTOMER_SERVICE_KNOWLEDGE_BASE（zh，64 条）与
// CUSTOMER_SERVICE_TCG_FAQ_KB（en TCG，12 条），以及 payload 里的 knowledge_base 字段。
// 原因：bridge 的 _resolve_knowledge_base() 是「本地优先」——按 payload.site 去
// kb_local_dir 找 {site}.json，找到就只用本地文件，payload 里带的那份自始至终不会被读。
// 生产实测两个 site 都命中本地，不是推断：
//   curl -s http://127.0.0.1:8787/health   # local_kb_sites: ["kangaroo-japan-tcg","kangaroo-japan"]
// 所以前端这两份数组早就是死代码，而且已经悄悄过期（促销停在 6 月、TCG 还写着旧品牌名）；
// bridge 那份还会被 scripts/daily_review.py「复盘采纳」自动写入新条目，前端手抄永远追不上。
// 唯一真源：kangaroo-customer-service-bridge/knowledge_base/{kangaroo-japan,kangaroo-japan-tcg}.json
// 改话术只改那里，本文件不再持有任何话术副本。
// 兜底行为（有意为之）：万一 bridge 本地目录丢了，KB 取到空数组 → Hermes 按「KB 里没有
// 就 transfer_human」转人工，是大声降级；好过以前那种拿 6 月旧价悄悄答错钱数
// （bridge 侧另有 local_kb_dir_missing 日志）。
// 旧内容考古：git show 69bcbb5:src/app/api/support/chat/route.ts

export const dynamic = "force-dynamic";

// English fail-closed copy for the TCG FAQ assistant. When the assistant can't
// answer (bridge offline/timeout/out of scope/order-specific), it points the
// U.S. customer to the contact-page channels instead of promising anything.
const TCG_HUMAN_HANDOFF_REPLY =
  "I can only help with general FAQ here and can't look up specific orders. For anything about your order, refund, payment, or address, please reach our team by email at support@jp-buy.com or on WhatsApp via the Contact page, and a human agent will help you.";
const TCG_OUT_OF_SCOPE_REPLY =
  "I can help with questions about buying Japanese Pokemon and Yu-Gi-Oh cards through Kangaroo Japan - fees, value-added services, card condition, grading, sealed-product risk, packaging, consolidation, U.S. customs, and shipping. Try asking about one of those, or reach a human agent by email at support@jp-buy.com or on WhatsApp via the Contact page.";

// English business-scope keywords for the TCG FAQ guardrail. Broad enough to let
// genuine TCG/proxy questions through, while blocking clearly off-topic prompts.
const TCG_BUSINESS_KEYWORDS = [
  "card",
  "cards",
  "pokemon",
  "pokémon",
  "yugioh",
  "yu-gi-oh",
  "tcg",
  "booster",
  "box",
  "sealed",
  "single",
  "graded",
  "grade",
  "grading",
  "psa",
  "bgs",
  "slab",
  "condition",
  "mint",
  "美品",
  "未開封",
  "buy",
  "buying",
  "proxy",
  "order",
  "ordering",
  "bid",
  "bidding",
  "auction",
  "seller",
  "mercari",
  "yahoo",
  "amazon",
  "surugaya",
  "japan",
  "japanese",
  "fee",
  "fees",
  "price",
  "pricing",
  "cost",
  "charge",
  "service fee",
  "handling",
  "exchange",
  "usd",
  "dollar",
  "ship",
  "shipping",
  "shipment",
  "delivery",
  "deliver",
  "parcel",
  "package",
  "packaging",
  "consolidate",
  "consolidation",
  "warehouse",
  "customs",
  "duty",
  "tax",
  "tariff",
  "de minimis",
  "import",
  "cbp",
  "inspection",
  "photo",
  "translate",
  "translation",
  "refund",
  "cancel",
  "return",
  "tracking",
  "track",
  "support",
  "help",
  "human",
  "agent",
  "how it works",
];

const TCG_GREETING_KEYWORDS = [
  "hello",
  "hi",
  "hey",
  "good morning",
  "good afternoon",
  "good evening",
  "thanks",
  "thank you",
];

const BUSINESS_SCOPE_REPLY =
  "袋鼠酱只负责代购、费用、订单、仓库、物流、平台商品这些业务问题哦～你可以换个和订单或商品有关的问题问我。";
const PRIVACY_AND_SECRET_REPLY =
  "这个内容袋鼠酱不能透露哦。涉及内部信息、商业机密、其他客户资料或账号安全的内容，都需要保护起来。你有自己的订单问题的话，可以告诉我具体场景，我再帮你转人工客服确认～";

const BUSINESS_KEYWORDS = [
  "代拍",
  "代购",
  "怎么买",
  "购买",
  "下单",
  "竞拍",
  "出价",
  "出不了价",
  "即决",
  "流拍",
  "截拍",
  "流程",
  "商品",
  "多少钱",
  "订单",
  "物流",
  "运送",
  "配送",
  "运费",
  "国际",
  "费用",
  "服务费",
  // 「增值服务 / 帮我计算价格 / 帮我给卖家留言」都是首页热门问题里的能力入口，
  // 原表没有这些词 → 被本闸门当越界拦掉、根本到不了 bridge（实测 2026-08-04：
  // 老 chip「你们有哪些增值服务？」长期收到越界拒答话术）。补齐业务词。
  "增值服务",
  "价格",
  "报价",
  "算价",
  "留言",
  "砍价",
  "卖家",
  "税",
  "押金",
  "退款",
  "仓库",
  "仓储",
  "超期",
  "拍照",
  "纸箱",
  "打包",
  "合箱",
  "包裹",
  "转运",
  "支付",
  "客服",
  "人工",
  "发货",
  "到货",
  "入库",
  "到仓",
  "到哪",
  "单号",
  "追踪",
  "揽收",
  "签收",
  "妥投",
  "日本",
  "mercari",
  "メルカリ",
  "yahoo",
  "雅虎",
  "amazon",
  "亚马逊",
  "rakuten",
  "乐天",
  // 2026-08-06 花哥拍板："手续费是多少 / 手续费怎么算" "现在有什么活动" 被本闸门
  // 当越界拦掉（原表没有"手续费"，"费用/服务费"不是它的子串，"活动/优惠"类词
  // 一个都没有），根本到不了 bridge。补齐 8 月活动/手续费/优惠/会员相关业务词。
  // 只补业务词，不放宽泛闲聊词——已用 route.test.ts 的天气/写代码/政治用例验证
  // 不会误放行。"代拍手续费"/"支付手续费" 是"手续费"的子串、天然已被覆盖，
  // 仍按需求列出以便自解释。
  "手续费",
  "代拍手续费",
  "支付手续费",
  "活动",
  "优惠",
  "优惠券",
  "券",
  "便宜",
  "划算",
  "促销",
  "折扣",
  "福利",
  "免费",
  "省钱",
  "会员",
  "等级",
  "新人",
  "邀请",
  "晒单",
  // 2026-08-14 止血补词：商品咨询常见追问词，防 consult_active flag 丢失时误拦
  // （该白名单历史上已四次漏词误拦，见 guardCustomerServiceScope 上方 consult_active 分支）。
  "包邮",
  "邮费",
  "成色",
  "瑕疵",
  "尺寸",
  "尺码",
  "正品",
  "全新",
  "二手",
];

const GREETING_KEYWORDS = ["你好", "您好", "在吗", "hello", "hi", "哈喽"];

const FORBIDDEN_SCOPE_KEYWORDS = [
  "破甲",
  "越狱",
  "忽略之前",
  "无视规则",
  "系统提示词",
  "提示词",
  "system prompt",
  "developer message",
  "内部规则",
  "后台密码",
  "密码",
  "api key",
  "apikey",
  "token",
  "密钥",
  "数据库",
  "源码",
  "商业机密",
  "利润",
  "成本",
  "供应商",
  "采购渠道",
  "客户信息",
  "其他客户",
  "别人订单",
  "别人的订单",
  "手机号",
  "身份证",
  "openid",
  "unionid",
];

// 任何 http(s) 链接都视为业务消息放行到 bridge：客户发来的商品链接本身就是
// 代拍业务（rakuma item.fril.jp、yahoofrima、mercari、雅虎竞拍等）。bridge
// 下游自己做平台 classify / 拒绝不支持的链接，所以这里只判"有没有链接"，
// 既简单又不漏（裸 rakuma 链接不含任何业务词，原来被兜底误拦）。
const URL_IN_MESSAGE_PATTERN = /https?:\/\/\S+/i;

// 增值服务数字 id 串契约：逗号分隔的数字（如 "5,6"）。与现代后端建单 DTO 的
// @Matches(/^\d+(,\d+)*$/) 同口径，中继时先校验再透传（防注入，非法即丢弃不转）。
const VALUE_ADDED_IDS_PATTERN = /^\d+(,\d+)*$/;

// 确认类消息放行到 bridge：报价卡 UI 提示「回复『确认』」、[确认下单] 按钮、
// 以及客户自然手打的确认下单意图。这些不含业务词，原来被兜底误拦，导致
// bridge 的建单端点不被调用（既不出待支付卡也不转人工）。
const CONFIRMATION_KEYWORDS = [
  "确认",
  "確認",
  "确定",
  "確定",
  "我确认",
  "确认下单",
  "确定下单",
  "确认购买",
  "确认支付",
  "确认付款",
  "录入订单",
  "确认录单",
];

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

// 取合法的增值服务数字 id 串（逗号数字），非法/空返回 undefined（中继不带该字段）。
function getValueAddedIds(value: unknown): string | undefined {
  const text = getString(value);
  return text && VALUE_ADDED_IDS_PATTERN.test(text) ? text : undefined;
}

function getH5UserIdCandidate(body: Record<string, unknown>) {
  return getString(body.userId) || getString(body.user_id);
}

function getContextUserIdState(userId: string | undefined): ContextUserIdState {
  if (!userId) return "missing";
  return NUMERIC_USER_ID_PATTERN.test(userId) ? "numeric" : "non_numeric";
}

function getTrustedH5UserId(body: Record<string, unknown>) {
  const userId = getH5UserIdCandidate(body);
  return getContextUserIdState(userId) === "numeric" ? userId : undefined;
}

function normalizeQuickQuestion(message: string) {
  return message
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ")
    .replace(/[?？]+$/u, "?");
}

function sanitizeCustomerReply(reply: string) {
  return reply
    .replace(/Hermes\s*(离线|下线)/giu, "袋鼠酱下线")
    .replace(/\bHermes\b/giu, "袋鼠酱");
}

// 审核模式兜底：bridge.py 的 review_mode_instruction 只是提示词，LLM 自由回复仍可能说出
// 「竞拍/代拍」。这里对所有审核模式下回给前端的助手文本做一次文案替换，不依赖 LLM 听话。
function sanitizeReviewModeReply(text: string) {
  return text
    .replace(/代拍/gu, "代购")
    .replace(/竞拍出价/gu, "代购")
    .replace(/或竞拍/gu, "")
    .replace(/竞拍/gu, "代购");
}

function transferHumanResponse(
  reason: string,
  reply = HUMAN_TRANSFER_REPLY,
  answeredBy = "bridge_fail_closed",
  reviewMode = false,
) {
  const cleanedReply = sanitizeCustomerReply(reply);
  return NextResponse.json({
    code: 0,
    data: {
      action: "transfer_human",
      type: "transfer_human",
      reply: reviewMode
        ? sanitizeReviewModeReply(cleanedReply)
        : cleanedReply,
      reason,
      sourceIds: [],
      // "53kf" is a legacy field value; the actual handoff destination is now
      // enterprise WeChat customer service (switched 2026-08-27, commit b3aa103).
      // 🔴 Do not change this value: the mini-program (pages/bundle/kefu/kefu.vue)
      // branches on data.fallback === '53kf' to trigger human handoff, and already
      // shipped old client versions can't be updated — changing it breaks their
      // handoff. What actually decides the redirect is type/action == transfer_human.
      fallback: "53kf",
      requiresTicket: true,
      isHighRisk: true,
      answeredBy,
    },
  });
}

function hasTrustedH5UserId(body: Record<string, unknown>) {
  return Boolean(getTrustedH5UserId(body));
}

function isPersonalizedStatusQuickQuestion(message: string) {
  return PERSONALIZED_STATUS_QUICK_QUESTIONS.has(
    normalizeQuickQuestion(message),
  );
}

function getPersonalizedStatusKind(
  message: string,
): PersonalizedStatusKind | null {
  const normalized = message.toLowerCase();
  if (
    ["入库", "到仓", "到库", "仓库"].some((keyword) =>
      normalized.includes(keyword),
    )
  ) {
    return "warehouse";
  }
  if (
    ["到哪", "物流", "发货", "追踪", "单号"].some((keyword) =>
      normalized.includes(keyword),
    )
  ) {
    return "tracking";
  }
  if (
    normalized.includes("押金") &&
    ["退", "状态", "到账"].some((keyword) => normalized.includes(keyword))
  ) {
    return "deposit";
  }
  return null;
}

function shouldPassPersonalizedStatusToBridge(
  message: string,
  body: Record<string, unknown>,
) {
  return (
    hasTrustedH5UserId(body) &&
    (isPersonalizedStatusQuickQuestion(message) ||
      getPersonalizedStatusKind(message) !== null)
  );
}

function personalizedStatusFallbackResponse(
  kind: PersonalizedStatusKind,
  reviewMode: boolean,
) {
  const replyByKind: Record<PersonalizedStatusKind, string> = {
    warehouse:
      "商品是否入库需要以小程序订单状态为准。若你已经登录并从订单入口进入客服，袋鼠酱可以继续帮你核对；未登录时请联系人工客服确认。",
    tracking:
      "订单当前状态需要以小程序里的订单和物流信息为准。若你已经登录并从订单入口进入客服，袋鼠酱可以继续帮你核对；未登录时请联系人工客服确认。",
    deposit:
      "押金退款状态需要结合你的登录身份和押金记录核对。未登录或无法确认身份时，会转人工客服继续处理。",
  };
  const reply = replyByKind[kind];

  return NextResponse.json({
    code: 0,
    data: {
      action: "answered",
      type: "answered",
      reply: reviewMode ? sanitizeReviewModeReply(reply) : reply,
      reason: "quick_question_identity_required",
      sourceIds: [QUICK_REPLY_SOURCE_ID, "identity-required-status-fallback"],
      answeredBy: QUICK_REPLY_SOURCE_ID,
      requiresTicket: false,
      isHighRisk: false,
    },
  });
}

function quickReplyResponse(
  message: string,
  body: Record<string, unknown>,
  reviewMode: boolean,
) {
  if (!isQuickReplyEnabled()) return null;
  const personalizedStatusKind = getPersonalizedStatusKind(message);
  if (shouldPassPersonalizedStatusToBridge(message, body)) return null;

  const quickReply = QUICK_REPLIES.get(normalizeQuickQuestion(message));
  if (!quickReply && personalizedStatusKind) {
    return personalizedStatusFallbackResponse(
      personalizedStatusKind,
      reviewMode,
    );
  }
  if (!quickReply) return null;

  if (quickReply.action === "transfer_human") {
    return NextResponse.json({
      code: 0,
      data: {
        action: "transfer_human",
        type: "transfer_human",
        reply: reviewMode
          ? sanitizeReviewModeReply(HUMAN_TRANSFER_REPLY)
          : HUMAN_TRANSFER_REPLY,
        reason: quickReply.reason,
        sourceIds: [QUICK_REPLY_SOURCE_ID, quickReply.sourceId],
        sourceVersion: quickReply.sourceVersion,
        // "53kf" legacy value, see transferHumanResponse() above — do not change.
        fallback: "53kf",
        requiresTicket: true,
        isHighRisk: true,
        answeredBy: QUICK_REPLY_SOURCE_ID,
      },
    });
  }

  return NextResponse.json({
    code: 0,
    data: {
      action: "answered",
      type: "answered",
      reply: reviewMode
        ? sanitizeReviewModeReply(quickReply.reply)
        : quickReply.reply,
      reason: "quick_question_answered",
      sourceIds: [QUICK_REPLY_SOURCE_ID, quickReply.sourceId],
      sourceVersion: quickReply.sourceVersion,
      answeredBy: QUICK_REPLY_SOURCE_ID,
      requiresTicket: false,
      isHighRisk: false,
    },
  });
}

function guardedReply(reason: string, reply: string, reviewMode = false) {
  return NextResponse.json({
    code: 0,
    data: {
      action: "answered",
      type: "answered",
      reply: reviewMode ? sanitizeReviewModeReply(reply) : reply,
      reason,
      sourceIds: ["local-customer-service-guardrail"],
      answeredBy: "kangaroo-chan-guardrail",
      requiresTicket: false,
      isHighRisk: true,
    },
  });
}

function includesAnyKeyword(message: string, keywords: string[]) {
  const normalized = message.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

// 审核模式：小程序送审期间不支持雅虎竞拍链接，命中就固定回复、不转发 bridge
// （不让 LLM/bridge 有机会顺着链接聊出竞拍相关内容）。
const YAHOO_AUCTION_LINK_PATTERN = /auctions\.yahoo(?:\.co\.jp)?/iu;

const YAHOO_AUCTION_UNSUPPORTED_REPLY =
  "不好意思，这个链接类型袋鼠酱暂时还不支持代购哦～可以发煤炉（Mercari）或乐天フリマ（Rakuma）的商品链接给我，我帮你计算价格～";

// 审核模式：纯文字提及竞拍/出价/押金等词也要拦（不止链接），命中就固定回复、不转发
// bridge，避免 LLM 顺着文字聊出竞拍相关内容。
const REVIEW_MODE_AUCTION_KEYWORD_PATTERN =
  /雅虎|yahoo|ヤフオク|日拍|竞拍|競拍|拍卖|拍賣|代拍|出价|出價|竞价|竞标|加价|押金|保证金|中标|截拍/iu;

const REVIEW_MODE_AUCTION_TOPIC_REPLY =
  "不好意思，这个业务袋鼠酱这边暂时没有开通哦～目前支持煤炉（Mercari）和乐天フリマ（Rakuma）等平台的商品代购，你可以把商品链接发给我，我帮你计算价格～";

function guardCustomerServiceScope(
  body: Record<string, unknown>,
  reviewMode: boolean,
) {
  const message = getString(body.message) || "";
  if (!message) return null;

  if (includesAnyKeyword(message, FORBIDDEN_SCOPE_KEYWORDS)) {
    return guardedReply(
      "guardrail_privacy_or_secret",
      PRIVACY_AND_SECRET_REPLY,
      reviewMode,
    );
  }

  if (includesAnyKeyword(message, GREETING_KEYWORDS)) {
    return null;
  }

  // 含商品链接（任意 http(s) URL）→ 放行交 bridge。裸 rakuma 链接不含业务词，
  // 原来被下面的兜底误拦；放行后 bridge 自己 classify / 出报价卡。
  if (URL_IN_MESSAGE_PATTERN.test(message)) {
    return null;
  }

  // 确认类消息（回复『确认』/确认下单 等）→ 放行交 bridge 走建单/确认流。
  if (includesAnyKeyword(message, CONFIRMATION_KEYWORDS)) {
    return null;
  }

  // 客户点过报价卡【咨询商品】后 10 分钟内的追问放行到 bridge：bridge 侧有
  // _consult_pending 会话态承接（ASSISTED_CONSULT_TTL 600s，与 H5 端 consultActiveUntilRef
  // 对齐）。H5 每轮追问都走本端点（bridge 会话不产生 conversationId），若仍按下面的
  // BUSINESS_KEYWORDS 白名单硬拦，"是否包邮"这类不含业务词的追问会被兜底话术顶回、消息
  // 根本到不了 bridge（真机 bug）。客户端可伪造该 flag，但后果仅等同于消息里含了业务
  // 关键词，不产生额外风险面。
  if (body.consult_active === true) return null;

  if (!includesAnyKeyword(message, BUSINESS_KEYWORDS)) {
    return guardedReply(
      "guardrail_out_of_business_scope",
      BUSINESS_SCOPE_REPLY,
      reviewMode,
    );
  }

  return null;
}

function buildBridgePayload(
  body: Record<string, unknown>,
  reviewMode: boolean,
) {
  const sessionId =
    getString(body.externalSessionId) ||
    getString(body.sessionId) ||
    getString(body.conversationId) ||
    `mini-h5-${crypto.randomUUID()}`;
  const sourcePlatform = getString(body.sourcePlatform);
  const sourceGoodsId = getString(body.sourceGoodsId);
  const rawUserId = getH5UserIdCandidate(body);
  const contextUserIdState = getContextUserIdState(rawUserId);
  const userId = contextUserIdState === "numeric" ? rawUserId : undefined;
  const uidSignTs = getString(body.ts);
  const uidSignSig = getString(body.sig);

  // 买家在报价卡勾选的增值服务数字 id 串（逗号数字，如 "5,6"）。原样透传给 bridge，
  // 漏转=买家加购的服务被中继吞掉、确认建单时拿不到 → 不收费。空/非法即不带（向后兼容）。
  const selectedValueAddedIds = getValueAddedIds(body.selected_value_added_ids);

  return {
    session_id: sessionId,
    message: getString(body.message) || "",
    language: getString(body.language) || "zh",
    site: getString(body.site) || "kangaroo-japan",
    selected_value_added_ids: selectedValueAddedIds,
    context: {
      user_id: userId,
      ts: uidSignTs,
      sig: uidSignSig,
      context_user_id_state: contextUserIdState,
      shop: sourcePlatform,
      gid: sourceGoodsId,
      source_channel: getString(body.sourceChannel),
      source_page: getString(body.sourcePage),
      // 审核模式：告诉 bridge 本轮别聊竞拍/出价/押金、统一说「代购」不说「代拍」，
      // 具体系统提示词由 bridge 侧拼装（这里只透传开关，不在前端重复维护提示词文案）。
      review_mode: reviewMode,
      review_mode_instruction: reviewMode
        ? "本轮为审核模式：不要主动提及或提供竞拍出价、押金相关服务；统一用「代购」，不要用「代拍」。"
        : undefined,
    },
    // 不带 knowledge_base：话术由 bridge 本地文件托管（见文件上方「客服话术知识库归属」）。
  };
}

function getHashTail(value: unknown) {
  const text = getString(value);
  if (!text) return undefined;
  return createHash("sha256").update(text).digest("hex").slice(-6);
}

function getBridgeIntent(body: Record<string, unknown>) {
  const explicitIntent = getString(body.intent) || getString(body.intentName);
  if (explicitIntent) return explicitIntent;
  const message = getString(body.message);
  return message ? getPersonalizedStatusKind(message) || undefined : undefined;
}

function logBridgePayloadDiagnostic(
  payload: ReturnType<typeof buildBridgePayload>,
  body: Record<string, unknown>,
) {
  const context = getRecord(payload.context);
  const rawUserId = getH5UserIdCandidate(body);
  const trustedUserId = getTrustedH5UserId(body);

  console.info("support_chat_bridge_payload", {
    timestamp: new Date().toISOString(),
    session_hash_tail: getHashTail(payload.session_id),
    source_channel: getString(context.source_channel),
    shop: getString(context.shop),
    intent: getBridgeIntent(body),
    context_user_id_state: context.context_user_id_state,
    user_id_length: rawUserId?.length,
    user_id_last_digit: trustedUserId?.slice(-1),
  });
}

function buildBridgeUrl(baseUrl: string) {
  const url = new URL(baseUrl);
  const prefix = url.pathname.replace(/\/+$/, "");
  url.pathname = `${prefix}/v1/customer-service/chat`;
  url.search = "";
  return url;
}

async function callHermesBridge(
  body: Record<string, unknown>,
  reviewMode: boolean,
) {
  if (!HERMES_BRIDGE_URL || !HERMES_BRIDGE_TOKEN) {
    return transferHumanResponse(
      "hermes_bridge_unconfigured",
      undefined,
      undefined,
      reviewMode,
    );
  }

  // 审核模式：命中雅虎竞拍链接直接固定回复，不转发 bridge（不让 LLM 有机会
  // 顺着链接聊出竞拍相关内容）。非审核模式完全不受影响。
  if (reviewMode) {
    const message = getString(body.message) || "";
    if (YAHOO_AUCTION_LINK_PATTERN.test(message)) {
      return guardedReply(
        "review_mode_yahoo_auction_unsupported",
        YAHOO_AUCTION_UNSUPPORTED_REPLY,
        reviewMode,
      );
    }

    // 审核模式：纯文字提及竞拍/出价/押金等业务词，同样直接固定回复、不转发 bridge。
    if (REVIEW_MODE_AUCTION_KEYWORD_PATTERN.test(message)) {
      return guardedReply(
        "review_mode_auction_topic_unsupported",
        REVIEW_MODE_AUCTION_TOPIC_REPLY,
        reviewMode,
      );
    }
  }

  let response: Response;
  const timeoutMs =
    Number(process.env.HERMES_BRIDGE_TIMEOUT_MS) || HERMES_BRIDGE_TIMEOUT_MS;
  const timeoutController = new AbortController();
  const timeoutTimer = setTimeout(() => timeoutController.abort(), timeoutMs);
  try {
    const bridgeUrl = buildBridgeUrl(HERMES_BRIDGE_URL);
    const bridgePayload = buildBridgePayload(body, reviewMode);
    logBridgePayloadDiagnostic(bridgePayload, body);
    response = await fetch(bridgeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-kangaroo-agent-token": HERMES_BRIDGE_TOKEN,
      },
      body: JSON.stringify(bridgePayload),
      cache: "no-store",
      signal: timeoutController.signal,
    });
  } catch {
    const reason = timeoutController.signal.aborted
      ? "bridge_timeout"
      : "bridge_unreachable";
    return transferHumanResponse(reason, undefined, undefined, reviewMode);
  } finally {
    clearTimeout(timeoutTimer);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    return transferHumanResponse(
      `hermes_bridge_http_${response.status}`,
      undefined,
      undefined,
      reviewMode,
    );
  }

  const bridge = getRecord(payload);
  const action = getString(bridge.action);
  const reply = getString(bridge.reply);
  const reason = getString(bridge.reason);
  const sourceIds = Array.isArray(bridge.source_ids) ? bridge.source_ids : [];
  const answeredBy = getString(bridge.answered_by);
  const orderRef = bridge.order_ref;
  const quoteRef = bridge.quote_ref;
  // 「我的订单到哪了」已支付分支：两按钮选择卡（到日本仓进度 / 国际物流出仓后）。
  // 缺省即不渲染，零回归。
  const choice = bridge.choice;
  // 两按钮点选后下发的「该阶段订单列表卡」。前端 parseSupportResponse 读 data.list，
  // 必须把 bridge 顶层 list 原样透传（同 order_ref / choice）；漏转会让列表卡被吞、不渲染。
  // 缺省即 undefined，零回归。
  const list = bridge.list;
  // 智能客服辅助购买（CS-Assisted Purchase）：bridge 在建单成功时于返回体顶层 emit
  // proxy_buy_pay 待支付卡（开关 CS_ASSISTED_PURCHASE_ENABLED 默认 OFF 时不会 emit）。
  // 必须像 order_ref / quote_ref / choice / list 一样原样透传；漏转会让待支付卡被中继吞掉、前端永远收不到。
  // 缺省即 undefined，零回归（开关 OFF 时这段 dormant）。
  const proxyBuyPay = bridge.proxy_buy_pay;

  if (action === "transfer_human") {
    return transferHumanResponse(
      reason || "hermes_transfer_human",
      reply,
      undefined,
      reviewMode,
    );
  }

  if (!reply || (action !== "answered" && action !== "ask_clarify")) {
    return transferHumanResponse(
      "hermes_bridge_invalid_response",
      undefined,
      undefined,
      reviewMode,
    );
  }

  const cleanedBridgeReply = sanitizeCustomerReply(reply);

  return NextResponse.json({
    code: 0,
    data: {
      action,
      reply: reviewMode
        ? sanitizeReviewModeReply(cleanedBridgeReply)
        : cleanedBridgeReply,
      reason,
      order_ref: orderRef,
      quote_ref: quoteRef,
      choice,
      list,
      proxy_buy_pay: proxyBuyPay,
      sourceIds,
      answeredBy: answeredBy || "m4-hermes-customer-support",
      requiresTicket: false,
      isHighRisk: false,
    },
  });
}

// ---------------------------------------------------------------------------
// jp-buy U.S. TCG site: FAQ-only English assistant (v1).
//
// This path is fully isolated from the mini-program flow above: it never reads a
// user_id, never runs personalized-status / order-lookup, and never falls back to
// the Chinese enterprise-WeChat-support transfer text. v1 answers general FAQ only (fees, value-added
// services, condition, grading, sealed risk, packaging, consolidation, customs,
// shipping) and hands off order-specific questions to email/WhatsApp.
// Order lookup (查单) is intentionally deferred to phase 2 once the TCG user ↔
// legacy order mapping is in place.
// ---------------------------------------------------------------------------

const TCG_FAQ_SITE = "kangaroo-japan-tcg";

function isTcgFaqRequest(body: Record<string, unknown>) {
  if (body.faqOnly === true || body.faq_only === true) return true;
  const site = getString(body.site);
  return site === TCG_FAQ_SITE;
}

function tcgFaqHandoffResponse(reason: string) {
  return NextResponse.json({
    code: 0,
    data: {
      action: "transfer_human",
      type: "transfer_human",
      reply: TCG_HUMAN_HANDOFF_REPLY,
      reason,
      sourceIds: ["tcg-faq", "tcg-refund-001"],
      faqOnly: true,
      fallback: "email_whatsapp",
      requiresTicket: true,
      isHighRisk: false,
      answeredBy: "tcg-faq-handoff",
    },
  });
}

function tcgFaqGuardrail(message: string) {
  if (includesAnyKeyword(message, FORBIDDEN_SCOPE_KEYWORDS)) {
    return NextResponse.json({
      code: 0,
      data: {
        action: "answered",
        type: "answered",
        reply: TCG_OUT_OF_SCOPE_REPLY,
        reason: "tcg_guardrail_privacy_or_secret",
        sourceIds: ["tcg-faq", "tcg-boundary-001"],
        faqOnly: true,
        answeredBy: "tcg-faq-guardrail",
        requiresTicket: false,
        isHighRisk: true,
      },
    });
  }

  if (includesAnyKeyword(message, TCG_GREETING_KEYWORDS)) {
    return null;
  }

  if (!includesAnyKeyword(message, TCG_BUSINESS_KEYWORDS)) {
    return NextResponse.json({
      code: 0,
      data: {
        action: "answered",
        type: "answered",
        reply: TCG_OUT_OF_SCOPE_REPLY,
        reason: "tcg_guardrail_out_of_business_scope",
        sourceIds: ["tcg-faq", "tcg-boundary-001"],
        faqOnly: true,
        answeredBy: "tcg-faq-guardrail",
        requiresTicket: false,
        isHighRisk: false,
      },
    });
  }

  return null;
}

function buildTcgFaqBridgePayload(body: Record<string, unknown>) {
  // FAQ-only: deliberately NO user_id / order context is forwarded, so the
  // bridge/Hermes cannot run any order lookup for v1.
  const sessionId =
    getString(body.externalSessionId) ||
    getString(body.sessionId) ||
    getString(body.conversationId) ||
    `tcg-faq-${crypto.randomUUID()}`;

  return {
    session_id: sessionId,
    message: getString(body.message) || "",
    language: "en",
    site: TCG_FAQ_SITE,
    mode: "faq_only",
    faq_only: true,
    context: {
      faq_only: true,
      order_lookup_enabled: false,
      source_channel: getString(body.sourceChannel) || "tcg_web_widget",
      source_page: getString(body.sourcePage),
    },
    // No knowledge_base: the bridge owns TCG copy locally (see the KB-ownership
    // note above); site=kangaroo-japan-tcg resolves to its own local file.
  };
}

async function callTcgFaqBridge(body: Record<string, unknown>) {
  if (!HERMES_BRIDGE_URL || !HERMES_BRIDGE_TOKEN) {
    return tcgFaqHandoffResponse("tcg_bridge_unconfigured");
  }

  let response: Response;
  const timeoutMs =
    Number(process.env.HERMES_BRIDGE_TIMEOUT_MS) || HERMES_BRIDGE_TIMEOUT_MS;
  const timeoutController = new AbortController();
  const timeoutTimer = setTimeout(() => timeoutController.abort(), timeoutMs);
  try {
    const bridgeUrl = buildBridgeUrl(HERMES_BRIDGE_URL);
    const bridgePayload = buildTcgFaqBridgePayload(body);
    response = await fetch(bridgeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-kangaroo-agent-token": HERMES_BRIDGE_TOKEN,
      },
      body: JSON.stringify(bridgePayload),
      cache: "no-store",
      signal: timeoutController.signal,
    });
  } catch {
    const reason = timeoutController.signal.aborted
      ? "tcg_bridge_timeout"
      : "tcg_bridge_unreachable";
    return tcgFaqHandoffResponse(reason);
  } finally {
    clearTimeout(timeoutTimer);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    return tcgFaqHandoffResponse(`tcg_bridge_http_${response.status}`);
  }

  const bridge = getRecord(payload);
  const action = getString(bridge.action);
  const reply = getString(bridge.reply);
  const reason = getString(bridge.reason);
  const sourceIds = Array.isArray(bridge.source_ids) ? bridge.source_ids : [];
  const answeredBy = getString(bridge.answered_by);

  // v1 fail-closed: anything that isn't a clean answer becomes an email/WhatsApp
  // handoff. We never expose an order lookup result even if the bridge returns one.
  // NOTE: this TCG FAQ path intentionally does NOT forward order_ref / choice /
  // list — it is FAQ-only with no order lookup. The mini-program 两按钮查单
  // (到日本仓进度 / 国际物流出仓后) flows through callHermesBridge, never here, so
  // the list-card forwarding fix lives there, not in this path.
  if (action === "transfer_human") {
    return tcgFaqHandoffResponse(reason || "tcg_transfer_human");
  }

  if (!reply || (action !== "answered" && action !== "ask_clarify")) {
    return tcgFaqHandoffResponse("tcg_bridge_invalid_response");
  }

  return NextResponse.json({
    code: 0,
    data: {
      action,
      type: action,
      reply: sanitizeCustomerReply(reply),
      reason,
      sourceIds,
      faqOnly: true,
      answeredBy: answeredBy || "m4-hermes-tcg-faq",
      requiresTicket: false,
      isHighRisk: false,
    },
  });
}

async function tcgFaqChatResponse(body: Record<string, unknown>) {
  const message = getString(body.message);
  if (!message) {
    return tcgFaqHandoffResponse("tcg_empty_message");
  }

  const guardrail = tcgFaqGuardrail(message);
  if (guardrail) {
    return guardrail;
  }

  return callTcgFaqBridge(body);
}

export async function POST(request: NextRequest) {
  try {
    const parsedBody = await parseRequestJsonObject(request);

    if (!parsedBody.ok) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid request body" } },
        { status: 400 },
      );
    }

    // jp-buy U.S. TCG site (FAQ-only, English). Handled before any mini-program
    // logic so it never touches order lookup / personalized status / Chinese KB.
    if (isTcgFaqRequest(parsedBody.data)) {
      return tcgFaqChatResponse(parsedBody.data);
    }

    const reviewMode = await getReviewMode();

    const message = getString(parsedBody.data.message);
    if (message) {
      const response = quickReplyResponse(
        message,
        parsedBody.data,
        reviewMode,
      );
      if (response) {
        return response;
      }
    }

    const guardrailResponse =
      message && shouldPassPersonalizedStatusToBridge(message, parsedBody.data)
        ? null
        : guardCustomerServiceScope(parsedBody.data, reviewMode);
    if (guardrailResponse) {
      return guardrailResponse;
    }

    if (HERMES_BRIDGE_URL || HERMES_BRIDGE_TOKEN) {
      return callHermesBridge(parsedBody.data, reviewMode);
    }

    const response = await fetch(`${SUPPORT_API_BASE_URL}/support/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": request.headers.get("accept-language") || "zh",
      },
      body: JSON.stringify(parsedBody.data),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    return NextResponse.json(data ?? { code: response.status }, {
      status: response.status,
    });
  } catch (error) {
    unstable_rethrow(error);

    return NextResponse.json(
      {
        code: "SUPPORT_PROXY_ERROR",
        message: "Support service is temporarily unavailable",
      },
      { status: 502 },
    );
  }
}
