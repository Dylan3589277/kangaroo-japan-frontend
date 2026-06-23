"use client";

import {
  type CSSProperties,
  FormEvent,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ExternalLink,
  Headset,
  MessageCircle,
  ShoppingBag,
  Send,
  Tag,
  UserRoundCheck,
} from "lucide-react";

import { getH5UidSignature, getNumericH5UserId } from "./identity";

type ChatItem = {
  id?: string;
  role: "assistant" | "user" | "support";
  content: string;
  orderRef?: OrderRef;
  quoteRef?: QuoteRef;
  choiceRef?: ChoiceRef;
  createdAt?: string;
};

type OrderRef = {
  order_id?: string;
  goods_name?: string;
  amount?: string;
  amount_rmb?: string;
};

// 「我的订单到哪了」已支付分支的两按钮选择卡。点按钮 = 发送 send_text 预设文本，
// bridge 据此精确路由到 warehouse_status / tracking。缺省即不渲染，零回归。
type ChoiceOption = {
  label?: string;
  send_text?: string;
};

type ChoiceRef = {
  prompt?: string;
  options?: ChoiceOption[];
};

type QuoteRef = {
  platform?: string;
  item_id?: string;
  goods_name?: string;
  cover?: string;
  price_jpy?: number;
  purchasable?: boolean;
  unpurchasable_reason?: string;
  fee_service_jpy?: number;
  fee_agent_jpy?: number;
  domestic_shipping_note?: string;
  est_goods_rmb?: string;
  rate_note?: string;
  // 雅虎新增（全部 optional，mercari 不传即不渲染，零回归）。
  // 字段契约见 .team/artifacts/yahoo-quote-frontend-fields.md
  sale_type?: string; // 'sokketsu' | 'auction'
  action_hint?: string; // 'contact_kefu' | 'bid' | 'recharge_deposit' | 'login_required'
  action_text?: string; // 即決 CTA 文案
  // 竞拍（auction）专有
  current_bid?: number; // 当前出价（= price_jpy）
  buyout_jpy?: number; // 一口价；0=无
  left_time?: string; // 剩余/终了时间文案（日文原样）
  bid_num?: number; // 出价数
  deposit_state?: string; // 'ok' | 'insufficient' | 'unknown'
  deposit_balance_rmb?: number; // 押金余额（元，仅查到会员时下发）
  deposit_locked_jpy?: number; // 已在拍占用额度（日元，仅查到会员时下发）
  max_bid_allowed_jpy?: number; // 本次可出价上限（日元）
  suggest_recharge_rmb?: number; // 建议充值额（元，仅 insufficient 下发）
  // ── 可选增值服务（报价卡展示+买家勾选；勾选只前端记录，实际计费在录单环节由 L1/L2/客服处理）。
  //    字段契约见 .team/artifacts/buy-optional-services-design.md。
  //    缺省即不渲染可选服务区，零回归。
  optional_services?: OptionalService[];
  // ── >5万风险确认（卖家核验结果）。needs_confirm=true 时报价卡显著展示风险确认卡。
  //    字段契约见 .team/artifacts/high-value-seller-verify-design.md。缺省即不渲染，零回归。
  seller_risk?: SellerRisk;
};

// 可选增值服务一项。所有服务（含安心鉴定）统一为扁平结构：勾选框 + 精确日元费用。
// 安心鉴定由后端按卖家实际开通的品类直接下发精确 fee_jpy，前端不再做品类选择。
type OptionalService = {
  code?: string; // 'misdelivery_check' | 'pre_inbound_photo' | 'mercari_anshin_kantei'
  label?: string; // 展示名（如「错发漏发检查」「mercari安心鉴定」）
  fee_jpy?: number; // 精确费用（日元整数）
  note?: string; // 补充说明（如「建议追加，有保障」）
  checked_default?: boolean; // 默认是否勾选
  disabled?: boolean; // 是否禁选
};

// 卖家风险核验结果（>5万触发）。前端只展示，不信任也不回传这些判定字段做录入。
type SellerRisk = {
  needs_confirm?: boolean; // true=需买家风险确认才允许后续录入
  identity_verified?: boolean; // 卖家本人认证（mercari）；yahoo 多为 undefined（无字段）
  high_rating?: boolean; // 是否高评价（评价数≥50 且好评率≥98%）
  rating_count?: number; // 评价数
  rating_percent?: string; // 好评率文案（如「98.5%」「0.0%」）
  risk_points?: string[]; // 风险点文案列表（后端生成，前端原样展示）
  disclaimer?: string; // 「一旦购买成功不退不换」声明文案
};

type SupportParsedResponse = {
  text: string;
  transferHuman: boolean;
  conversationId?: string;
  queuedForHuman?: boolean;
  orderRef?: OrderRef;
  quoteRef?: QuoteRef;
  choiceRef?: ChoiceRef;
};

type MiniProgramWindow = Window & {
  wx?: {
    miniProgram?: {
      navigateTo?: (options: { url: string }) => void;
    };
  };
};

const QUICK_QUESTIONS = [
  "代拍流程是什么？",
  "代拍费用如何计算？",
  "国际运费怎么查？",
  "商品多久能到仓库？",
  "押金怎么退？",
  "我要转人工客服",
];

const SUPPORTED_PLATFORMS = new Set(["mercari", "amazon", "yahoo", "rakuten"]);
const HUMAN_TRANSFER_MESSAGE =
  "袋鼠酱这边暂时有点忙，我先带你转人工客服继续处理～";
const RESPONSE_TIME_NOTE =
  "我会尽量快点回复；复杂问题可能需要十几秒整理，请稍等一下。";
const MINI_PROGRAM_REAL_KEFU_PATH = "/pages/bundle/realkefu/realkefu";
const KF53_CHAT_URL = process.env.NEXT_PUBLIC_KF53_CHAT_URL || "";
// 雅虎竞拍押金不足时「去充押金」跳转的小程序充值页 path。
// 真实 path（形如 /pages/deposit/...）待花哥给，先用环境变量占位：
// 未配置时按钮禁用并显示「充值入口待配置」，绝不写死错误 path。
const YAHOO_DEPOSIT_RECHARGE_PAGE_PATH =
  process.env.NEXT_PUBLIC_YAHOO_DEPOSIT_RECHARGE_PAGE_PATH || "";

const WELCOME_ITEM: ChatItem = {
  role: "assistant",
  content:
    "嗨，我是袋鼠酱～你可以直接问我，也可以点下面的快捷问题。代拍流程、费用、国际运费这些我都能先帮你捋一捋；遇到需要人工确认的事，我会马上带你去找客服同事。",
};

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function getOrderRef(value: unknown): OrderRef | undefined {
  const record = getRecord(value);
  const orderId = getString(record.order_id);
  if (!orderId) return undefined;

  return {
    order_id: orderId,
    goods_name: getString(record.goods_name),
    amount: getString(record.amount),
    amount_rmb: getString(record.amount_rmb),
  };
}

function getStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((v) => getString(v))
    .filter((v): v is string => Boolean(v));
  return out.length ? out : undefined;
}

function getOptionalServices(value: unknown): OptionalService[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: OptionalService[] = [];
  for (const raw of value) {
    const r = getRecord(raw);
    const label = getString(r.label);
    const code = getString(r.code);
    // 至少要有 label 或 code 才算一条可渲染服务。
    if (!label && !code) continue;
    out.push({
      code,
      label,
      fee_jpy: getNumber(r.fee_jpy),
      note: getString(r.note),
      checked_default: getBoolean(r.checked_default),
      disabled: getBoolean(r.disabled),
    });
  }
  return out.length ? out : undefined;
}

function getSellerRisk(value: unknown): SellerRisk | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const r = getRecord(value);
  // 仅当后端真的给了 seller_risk（哪怕只有 needs_confirm）才返回，否则不渲染。
  const needsConfirm = getBoolean(r.needs_confirm);
  const identityVerified = getBoolean(r.identity_verified);
  const highRating = getBoolean(r.high_rating);
  const ratingCount = getNumber(r.rating_count);
  const ratingPercent = getString(r.rating_percent);
  const riskPoints = getStringArray(r.risk_points);
  const disclaimer = getString(r.disclaimer);
  if (
    needsConfirm === undefined &&
    identityVerified === undefined &&
    highRating === undefined &&
    ratingCount === undefined &&
    ratingPercent === undefined &&
    !riskPoints &&
    !disclaimer
  ) {
    return undefined;
  }
  return {
    needs_confirm: needsConfirm,
    identity_verified: identityVerified,
    high_rating: highRating,
    rating_count: ratingCount,
    rating_percent: ratingPercent,
    risk_points: riskPoints,
    disclaimer,
  };
}

function getQuoteRef(value: unknown): QuoteRef | undefined {
  const record = getRecord(value);
  const itemId = getString(record.item_id);
  const goodsName = getString(record.goods_name);
  const priceJpy = getNumber(record.price_jpy);
  // Need at least one substantive field to bother rendering a card.
  if (!itemId && !goodsName && priceJpy === undefined) return undefined;

  return {
    platform: getString(record.platform),
    item_id: itemId,
    goods_name: goodsName,
    cover: getString(record.cover),
    price_jpy: priceJpy,
    purchasable: getBoolean(record.purchasable),
    unpurchasable_reason: getString(record.unpurchasable_reason),
    fee_service_jpy: getNumber(record.fee_service_jpy),
    fee_agent_jpy: getNumber(record.fee_agent_jpy),
    domestic_shipping_note: getString(record.domestic_shipping_note),
    est_goods_rmb: getString(record.est_goods_rmb),
    rate_note: getString(record.rate_note),
    // 雅虎新增字段：缺省即 undefined，前端按存在性渲染。
    sale_type: getString(record.sale_type),
    action_hint: getString(record.action_hint),
    action_text: getString(record.action_text),
    current_bid: getNumber(record.current_bid),
    buyout_jpy: getNumber(record.buyout_jpy),
    left_time: getString(record.left_time),
    bid_num: getNumber(record.bid_num),
    deposit_state: getString(record.deposit_state),
    deposit_balance_rmb: getNumber(record.deposit_balance_rmb),
    deposit_locked_jpy: getNumber(record.deposit_locked_jpy),
    max_bid_allowed_jpy: getNumber(record.max_bid_allowed_jpy),
    suggest_recharge_rmb: getNumber(record.suggest_recharge_rmb),
    // 可选服务 / 卖家风险：缺省即 undefined，前端按存在性渲染（零回归）。
    optional_services: getOptionalServices(record.optional_services),
    seller_risk: getSellerRisk(record.seller_risk),
  };
}

function getChoiceRef(value: unknown): ChoiceRef | undefined {
  const record = getRecord(value);
  if (!Array.isArray(record.options)) return undefined;
  const options: ChoiceOption[] = [];
  for (const raw of record.options) {
    const r = getRecord(raw);
    const label = getString(r.label);
    const sendText = getString(r.send_text);
    // 两项都要齐才是一颗可点按钮（点击 = 发送 send_text）。
    if (!label || !sendText) continue;
    options.push({ label, send_text: sendText });
  }
  if (!options.length) return undefined;
  return { prompt: getString(record.prompt), options };
}

function parseSupportResponse(payload: unknown): SupportParsedResponse {
  const root = getRecord(payload);
  const data = getRecord(root.data) || root;
  const action = data.action || root.action;
  const type = data.type || root.type;
  const fallback = data.fallback || root.fallback;
  const transferHuman =
    action === "transfer_human" ||
    type === "transfer_human" ||
    fallback === "53kf";
  const orderRef = getOrderRef(data.order_ref || root.order_ref);
  const quoteRef = getQuoteRef(data.quote_ref || root.quote_ref);
  const choiceRef = getChoiceRef(data.choice || root.choice);

  const text =
    getString(data.reply) ||
    getString(data.answer) ||
    getString(data.message) ||
    getString(data.autoReply) ||
    (transferHuman
      ? HUMAN_TRANSFER_MESSAGE
      : "这个问题袋鼠酱需要请人工客服一起确认，点一下就能转过去～");

  return {
    text,
    transferHuman,
    conversationId: getString(data.conversationId),
    queuedForHuman: Boolean(data.queuedForHuman),
    orderRef,
    quoteRef,
    choiceRef,
  };
}

function mapServerRole(role: unknown): ChatItem["role"] {
  if (role === "visitor") return "user";
  if (role === "support") return "support";
  return "assistant";
}

function mapServerMessages(
  payload: unknown,
  // 自动报价那条链接的原文：用于把它从历史轮询里剔除，避免被补成 user 气泡。
  autoQuoteMessage?: string,
): ChatItem[] {
  const root = getRecord(payload);
  const data = getRecord(root.data);
  const messages = Array.isArray(data.messages) ? data.messages : [];
  // 只过滤"最早那条"内容完全等于自动报价链接的 visitor 消息，且只过滤一次：
  // 这样即便买家后续真的自己粘了同一条链接，也只吞掉自动发出的那一条。
  let autoQuoteFilterUsed = false;
  return messages
    .map((item) => {
      const record = getRecord(item);
      const content = getString(record.content);
      if (!content) return null;
      const role = mapServerRole(record.role);
      if (
        !autoQuoteFilterUsed &&
        autoQuoteMessage &&
        role === "user" &&
        content === autoQuoteMessage
      ) {
        autoQuoteFilterUsed = true;
        return null;
      }
      return {
        id: getString(record.id),
        role,
        content,
        createdAt: getString(record.createdAt),
      } satisfies ChatItem;
    })
    .filter(Boolean) as ChatItem[];
}

function isMiniProgramWebview() {
  if (typeof window === "undefined") return false;
  const win = window as MiniProgramWindow;
  return Boolean(win.wx?.miniProgram?.navigateTo);
}

function navigateToMiniProgramHumanKefu() {
  if (typeof window === "undefined") return false;
  const win = window as MiniProgramWindow;
  if (!win.wx?.miniProgram?.navigateTo) return false;
  win.wx.miniProgram.navigateTo({ url: MINI_PROGRAM_REAL_KEFU_PATH });
  return true;
}

function navigateToMiniProgramOrderDetail(orderId: string) {
  if (typeof window === "undefined") return false;
  const win = window as MiniProgramWindow;
  if (!win.wx?.miniProgram?.navigateTo) return false;
  win.wx.miniProgram.navigateTo({
    url: "/pages/daishujun/mine/orderDetail?id=" + orderId,
  });
  return true;
}

// 小程序内「我要购买」：跳袋鼠君小程序的 mercari 商品详情页（含「立即购买」按钮，
// 自带登录守卫 + 购买提示 + 进 confirm 结算页）。
// 路径与参数依据 daishujunApp/pages/daishujun/index/mercari_detail.vue：
//   - onLoad(e) 读 e.id（this.goodsNo = e.id），param 名是 `id`；
//   - 商品列表/收藏/购物车等全部用 `/pages/daishujun/index/mercari_detail?id=` + goods_no 跳转。
// 选商品详情页而非直接跳 ./confirm，是为了保留小程序侧 confirmOrder() 的登录守卫与购买提示，
// 不绕过任何下单守卫（与网页端 router.push(/checkout) 直达结算的差异见报告）。
function navigateToMiniProgramBuy(itemId: string) {
  if (typeof window === "undefined") return false;
  const win = window as MiniProgramWindow;
  if (!win.wx?.miniProgram?.navigateTo) return false;
  win.wx.miniProgram.navigateTo({
    url: "/pages/daishujun/index/mercari_detail?id=" + encodeURIComponent(itemId),
  });
  return true;
}

// 小程序内「去出价」：跳袋鼠君小程序的雅虎竞拍详情页（出价/押金在该页操作）。
// 路径依据 daishujunApp/pages/daishujun/index/yahoo_detail.vue：onLoad(e) 读 e.id，param 名是 `id`。
function navigateToMiniProgramYahooBid(itemId: string) {
  if (typeof window === "undefined") return false;
  const win = window as MiniProgramWindow;
  if (!win.wx?.miniProgram?.navigateTo) return false;
  win.wx.miniProgram.navigateTo({
    url: "/pages/daishujun/index/yahoo_detail?id=" + encodeURIComponent(itemId),
  });
  return true;
}

function navigateToMiniProgramDepositRecharge() {
  if (!YAHOO_DEPOSIT_RECHARGE_PAGE_PATH) return false;
  if (typeof window === "undefined") return false;
  const win = window as MiniProgramWindow;
  if (!win.wx?.miniProgram?.navigateTo) return false;
  win.wx.miniProgram.navigateTo({ url: YAHOO_DEPOSIT_RECHARGE_PAGE_PATH });
  return true;
}

function getKf53ChatUrl() {
  const rawUrl = KF53_CHAT_URL.trim();
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default function MiniProgramSupportH5Page() {
  const params = useParams<{ lang?: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = params?.lang || "zh";
  const initialSessionId = searchParams.get("session_id") || undefined;
  const userId = getNumericH5UserId(searchParams);
  const uidSignature = getH5UidSignature(searchParams);
  const sourceGoodsId = searchParams.get("gid") || undefined;
  const rawShop = searchParams.get("shop") || "mercari";
  const sourcePlatform = SUPPORTED_PLATFORMS.has(rawShop) ? rawShop : "mercari";
  const initialTransferHuman =
    searchParams.get("type") === "transfer_human" ||
    searchParams.get("fallback") === "53kf";
  const [conversationId, setConversationId] = useState<string | undefined>(
    searchParams.get("conversation_id") || undefined,
  );
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [pollingError, setPollingError] = useState("");
  const [humanTransferVisible, setHumanTransferVisible] =
    useState(initialTransferHuman);
  const [humanTransferNote, setHumanTransferNote] = useState(
    initialTransferHuman ? "袋鼠酱暂时接不上，我先帮你转人工客服～" : "",
  );
  const [items, setItems] = useState<ChatItem[]>([WELCOME_ITEM]);
  // 自动报价开场卡：作为独立 state 渲染在消息列表最上方，完全脱离 `items`。
  // 这样历史轮询的 setItems(整体替换) 永远碰不到它，报价卡不会被服务端历史冲掉。
  const [autoQuoteOpening, setAutoQuoteOpening] = useState<ChatItem | null>(
    null,
  );
  const [vpRect, setVpRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [wxReady, setWxReady] = useState(false);
  // 自动报价：从 mercari 商品页进客服时零输入拉一次报价卡片
  const [autoQuoteLoading, setAutoQuoteLoading] = useState(false);
  const autoQuoteTriggeredRef = useRef(false);
  // 自动报价那次发出的链接原文。历史轮询拉回时据此把这条 visitor 消息剔除，
  // 避免"零输入无链接气泡"被打破。仅在自动报价路径里写入。
  const autoQuoteMessageRef = useRef<string | undefined>(undefined);
  // 聊天输入框 ref：报价卡"咨询"按钮点了之后聚焦输入框，让买家自己打字提问。
  const inputRef = useRef<HTMLInputElement | null>(null);
  // 报价卡买家选择（纯前端记录，不立即扣费）：
  // - quoteServiceSelections：{cardKey -> {serviceCode -> checked}}，记录可选服务勾选。
  // - quoteRiskConfirmed：已点「我已知风险确认」的 cardKey 集合。
  // 这些只用于展示总额预览 + 点「我要购买」时随购买意图文本带出，不调任何录单/扣费接口。
  const [quoteServiceSelections, setQuoteServiceSelections] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [quoteRiskConfirmed, setQuoteRiskConfirmed] = useState<
    Record<string, boolean>
  >({});
  const kf53ChatUrl = getKf53ChatUrl();

  const externalSessionId = useMemo(
    () => initialSessionId || `mini-h5-${Date.now()}`,
    [initialSessionId],
  );

  const loadConversationMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const response = await fetch(
        `/api/support/conversations/${conversationId}/messages?limit=100`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("message polling failed");
      const payload = await response.json().catch(() => null);
      const serverItems = mapServerMessages(
        payload,
        autoQuoteMessageRef.current,
      );
      setItems([WELCOME_ITEM, ...serverItems]);
      setPollingError("");
    } catch {
      setPollingError("消息同步暂时失败，请稍后重试或联系人工客服。");
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    void loadConversationMessages();
    const timer = window.setInterval(() => {
      void loadConversationMessages();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [conversationId, loadConversationMessages]);

  useEffect(() => {
    const win = window as MiniProgramWindow;
    if (win.wx?.miniProgram?.navigateTo) {
      setWxReady(true);
      return;
    }
    const existing = document.getElementById("jweixin-sdk");
    if (existing) {
      existing.addEventListener("load", () => setWxReady(true));
      return;
    }
    const script = document.createElement("script");
    script.id = "jweixin-sdk";
    script.src = "https://res.wx.qq.com/open/js/jweixin-1.6.0.js";
    script.async = true;
    script.onload = () => setWxReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    // iOS 微信 webview：键盘弹出时 visualViewport 会缩小并带 offsetTop（页面被顶上去）。
    // 把容器 position:fixed 钉到"当前可视区"（top=offsetTop, height=可视高度），
    // 这样 body 怎么滚，聊天容器始终贴着可见区域，输入条永远浮在键盘上方、不再空白。
    const updateRect = () => {
      if (!viewport) {
        setVpRect(null);
        return;
      }
      setVpRect({
        top: Math.round(viewport.offsetTop),
        left: Math.round(viewport.offsetLeft),
        width: Math.round(viewport.width),
        height: Math.round(viewport.height),
      });
    };

    updateRect();
    viewport?.addEventListener("resize", updateRect);
    viewport?.addEventListener("scroll", updateRect);
    window.addEventListener("resize", updateRect);

    return () => {
      viewport?.removeEventListener("resize", updateRect);
      viewport?.removeEventListener("scroll", updateRect);
      window.removeEventListener("resize", updateRect);
    };
  }, []);

  // 自动报价：仅挂载时执行一次。从 mercari/yahoo 商品页（带 ?gid=xxx&shop=yyy）进客服时，
  // 零输入地用商品链接拉一次报价，把 assistant 回复 + 报价卡作为开场消息渲染，
  // 但**不**追加 user 角色气泡（不显示"用户发了一条链接"）。失败则静默，不影响正常聊天。
  useEffect(() => {
    if (autoQuoteTriggeredRef.current) return;
    // mercari 与 yahoo（即決+竞拍）从商品页进客服都自动弹卡；其它平台仍不触发。
    if (
      !sourceGoodsId ||
      (sourcePlatform !== "mercari" && sourcePlatform !== "yahoo")
    )
      return;
    // 已有会话历史（如刷新带 conversation_id）时不重复自动报价。
    if (conversationId) return;
    autoQuoteTriggeredRef.current = true;

    // 按平台拼商品 URL，交后端桥识别出卡（yahoo 即決+竞拍都支持）。
    const itemUrl =
      sourcePlatform === "yahoo"
        ? `https://auctions.yahoo.co.jp/jp/auction/${sourceGoodsId}`
        : `https://jp.mercari.com/item/${sourceGoodsId}`;
    // 记下自动报价发出的链接原文，供历史轮询剔除这条 visitor 消息（防止它被补成 user 气泡）。
    autoQuoteMessageRef.current = itemUrl;
    let cancelled = false;
    setAutoQuoteLoading(true);

    (async () => {
      try {
        const response = await fetch("/api/support/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept-Language": lang,
          },
          body: JSON.stringify({
            message: itemUrl,
            conversationId: undefined,
            site: "kangaroo-japan",
            language: lang === "ja" ? "ja" : lang === "en" ? "en" : "zh",
            sourceChannel: "mini_program_ai_webview",
            externalSessionId,
            userId,
            ts: uidSignature.ts,
            sig: uidSignature.sig,
            sourceGoodsId,
            sourcePlatform,
            sourcePage:
              typeof window === "undefined" ? undefined : window.location.href,
          }),
        });
        if (!response.ok) throw new Error("auto quote api failed");
        const payload = await response.json().catch(() => null);
        const parsed = parseSupportResponse(payload);
        if (cancelled) return;

        if (parsed.conversationId) {
          setConversationId(parsed.conversationId);
        }
        // 只有真的拿到报价卡才渲染开场卡；否则静默（避免无意义气泡/误转人工）。
        // 写进独立的 autoQuoteOpening state（不进 items），渲染在列表最上方，
        // 这样后续历史轮询的 setItems 整体替换永远冲不掉它。
        if (parsed.quoteRef) {
          setAutoQuoteOpening({
            role: "assistant",
            content: parsed.text || "已为您调取该商品信息：",
            quoteRef: parsed.quoteRef,
          });
        }
      } catch {
        // 自动报价失败彻底静默：不弹错误、不转人工、不阻塞后续手动聊天。
      } finally {
        if (!cancelled) setAutoQuoteLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // 仅挂载时跑一次：依赖刻意省略，配合 autoQuoteTriggeredRef 防 StrictMode 双挂载重复发。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendMessage(message: string) {
    const content = message.trim();
    if (!content || loading) return;

    if (content.includes("人工")) {
      setHumanTransferVisible(true);
      setHumanTransferNote("好呀，袋鼠酱这就帮你叫人工客服～");
    }

    setItems((current) => [...current, { role: "user", content }]);
    setDraft("");
    setLoading(true);

    try {
      const endpoint = conversationId
        ? `/api/support/conversations/${conversationId}/messages`
        : "/api/support/chat";
      const body = conversationId
        ? { content }
        : {
            message: content,
            conversationId,
            site: "kangaroo-japan",
            language: lang === "ja" ? "ja" : lang === "en" ? "en" : "zh",
            sourceChannel: "mini_program_ai_webview",
            externalSessionId,
            userId,
            ts: uidSignature.ts,
            sig: uidSignature.sig,
            sourceGoodsId,
            sourcePlatform,
            sourcePage:
              typeof window === "undefined" ? undefined : window.location.href,
          };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": lang,
        },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error("support api failed");
      }
      const parsed = parseSupportResponse(payload);

      if (parsed.conversationId) {
        setConversationId(parsed.conversationId);
      }
      if (parsed.transferHuman || parsed.queuedForHuman) {
        setHumanTransferVisible(true);
        setHumanTransferNote(parsed.text || HUMAN_TRANSFER_MESSAGE);
      }
      if (parsed.text && !parsed.queuedForHuman) {
        setItems((current) => [
          ...current,
          {
            role: "assistant",
            content: parsed.text,
            orderRef: parsed.orderRef,
            quoteRef: parsed.quoteRef,
            choiceRef: parsed.choiceRef,
          },
        ]);
      }
      if (parsed.conversationId || conversationId) {
        window.setTimeout(() => void loadConversationMessages(), 300);
      }
    } catch {
      setHumanTransferVisible(true);
      setHumanTransferNote("袋鼠酱这边暂时卡住了，我先带你转人工客服～");
      setItems((current) => [
        ...current,
        {
          role: "assistant",
          content: HUMAN_TRANSFER_MESSAGE,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function contactHuman() {
    if (navigateToMiniProgramHumanKefu()) return;
    if (kf53ChatUrl) {
      window.open(kf53ChatUrl, "_blank", "noopener,noreferrer");
      setHumanTransferVisible(true);
      setHumanTransferNote("已为你打开网页人工客服窗口，请在新窗口继续沟通。");
      return;
    }

    setHumanTransferVisible(true);
    setHumanTransferNote(
      "当前不是小程序 WebView 环境。请回到袋鼠君小程序，点击在线客服或人工客服入口联系人工客服。",
    );
  }

  function openOrderDetail(orderRef: OrderRef) {
    if (!orderRef.order_id) return;
    if (navigateToMiniProgramOrderDetail(orderRef.order_id)) return;

    setHumanTransferVisible(true);
    setHumanTransferNote(
      "请在袋鼠君小程序内打开本页面，再点击订单卡片查看或支付订单。",
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formMessage = formData.get("message");
    void sendMessage(typeof formMessage === "string" ? formMessage : draft);
  }

  // 报价卡"咨询"：不替买家发任何内容，只把输入框预填一句并聚焦，
  // 让买家自己改/补充后再发。避免自动发送敏感或不准确的咨询文本。
  function consultQuote() {
    setDraft((current) => current || "我想咨询这个商品");
    // 等 setDraft 触发的重渲染落地后再聚焦，确保光标停在输入框尾部。
    window.setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      const end = input.value.length;
      input.setSelectionRange(end, end);
    }, 0);
  }

  // 切换某张报价卡上某项可选服务的勾选（纯前端记录）。
  function toggleQuoteService(cardKey: string, serviceCode: string) {
    setQuoteServiceSelections((prev) => {
      const card = prev[cardKey] || {};
      return {
        ...prev,
        [cardKey]: { ...card, [serviceCode]: !card[serviceCode] },
      };
    });
  }

  // 买家点「我已知风险确认」：仅前端记录该卡已确认，不录入、不付款、不下单。
  function confirmQuoteRisk(cardKey: string) {
    setQuoteRiskConfirmed((prev) => ({ ...prev, [cardKey]: true }));
  }

  // 汇总某张报价卡上买家已勾选的服务（扁平 code+fee），生成中文摘要片段。
  // 仅用于拼进「我要购买」意图文本，交客服/录单环节核验计费，不在本卡计费。
  function summarizeSelectedServices(cardKey: string, quote: QuoteRef): string {
    const services = quote.optional_services;
    if (!services || services.length === 0) return "";
    const checkedMap = quoteServiceSelections[cardKey] || {};
    const picked: string[] = [];
    for (const svc of services) {
      const code = svc.code || svc.label || "";
      if (!code || !checkedMap[code]) continue;
      const label = svc.label || code;
      const fee = svc.fee_jpy !== undefined ? `${svc.fee_jpy}日元` : "";
      picked.push(`${label}${fee ? "（" + fee + "）" : ""}`);
    }
    return picked.length ? `；我想加购：${picked.join("、")}` : "";
  }

  // 汇总某张报价卡上买家已勾选的服务 code（仅 code，逗号分隔），用于透传给结算/小程序购买流程。
  // 与 summarizeSelectedServices（人读中文摘要）区分：这里是给 URL query 用的机读 code 列表。
  // 透传只是把买家选择带过去，结算/小程序端将来读不读都不影响本次路由（后端建单存费另做）。
  function collectSelectedServiceCodes(cardKey: string, quote: QuoteRef): string[] {
    const services = quote.optional_services;
    if (!services || services.length === 0) return [];
    const checkedMap = quoteServiceSelections[cardKey] || {};
    const codes: string[] = [];
    for (const svc of services) {
      const code = svc.code || svc.label || "";
      if (!code || !checkedMap[code]) continue;
      codes.push(code);
    }
    return codes;
  }

  // 报价卡「我要购买」：mercari 直接进**现成的**购买/待支付流程（不再发转人工套话）。
  //   - 小程序 webview 内 → 跳袋鼠君小程序 mercari 商品页（含「立即购买」，自带登录守卫/购买提示）；
  //   - 普通网页 H5 → router.push 现成网页结算页 /{lang}/checkout?type=mercari&id=...
  //     （与 mercari 商品页「立即购买」同一入口：createOrder → NewAge 付款 → 待支付）。
  // 买家勾选的可选服务 code 与已确认风险标记尽量作为 URL query 透传（services=逗号分隔code、risk_ack=1），
  // 结算/小程序端将来读取（后端建单存费由中枢另做，前端先透传，读不读不影响本次路由）。
  // 雅虎(platform==='yahoo')：即決/竞拍购买路径与 mercari 不同，本次保持原 sendMessage 行为不动。
  function buyQuote(cardKey: string, quote: QuoteRef) {
    // 雅虎不走本次新路由，保持原有「发购买意图文本 → 后端话术」行为，零回归。
    if (quote.platform === "yahoo") {
      let intent = "我要购买此商品";
      intent += summarizeSelectedServices(cardKey, quote);
      if (quote.seller_risk?.needs_confirm && quoteRiskConfirmed[cardKey]) {
        intent += "；我已了解高额订单风险（不退不换），请继续为我录入";
      }
      void sendMessage(intent);
      return;
    }

    // 以下仅 mercari：进现成购买流程。
    const itemId = quote.item_id;
    // 没有商品号无法定位购买流程：兜底回原 sendMessage 行为，避免跳到空 id 的结算页。
    if (!itemId) {
      void sendMessage("我要购买此商品" + summarizeSelectedServices(cardKey, quote));
      return;
    }

    // 买家选择透传：服务 code 列表 + 风险已确认标记。
    const serviceCodes = collectSelectedServiceCodes(cardKey, quote);
    const riskAck = Boolean(
      quote.seller_risk?.needs_confirm && quoteRiskConfirmed[cardKey],
    );

    // 小程序 webview：跳小程序内 mercari 购买入口。
    // 小程序商品页 onLoad 只接 id，不接服务/风险参数；透传暂随网页端，小程序端透传待小程序侧扩展。
    if (isMiniProgramWebview()) {
      if (navigateToMiniProgramBuy(itemId)) return;
      // 跳不动（理论上 isMiniProgramWebview 为真时不该发生）兜底回原行为。
      void sendMessage("我要购买此商品" + summarizeSelectedServices(cardKey, quote));
      return;
    }

    // 普通网页 H5：进现成网页结算页。带上服务/风险透传 query（结算端读不读都不影响路由）。
    const query = new URLSearchParams({ type: "mercari", id: itemId });
    if (serviceCodes.length > 0) query.set("services", serviceCodes.join(","));
    if (riskAck) query.set("risk_ack", "1");
    router.push(`/${lang}/checkout?${query.toString()}`);
  }

  // 雅虎竞拍「去充押金」：仅跳转小程序充值页，不触发任何金钱动作。
  // path 未配置（占位）时按钮本就禁用，这里再兜底：跳不动就引导回小程序。
  function goRechargeDeposit() {
    if (navigateToMiniProgramDepositRecharge()) return;
    setHumanTransferVisible(true);
    setHumanTransferNote(
      "请在袋鼠君小程序内打开『我的-我的押金』充值押金后再参与竞拍。",
    );
  }

  // 雅虎竞拍「去出价」：小程序内跳竞拍详情页（出价/押金在该页操作）；
  // 跳不动（网页端等）则引导回小程序——竞拍出价是小程序专属流程。
  function goYahooBid(itemId?: string) {
    if (itemId && navigateToMiniProgramYahooBid(itemId)) return;
    setHumanTransferVisible(true);
    setHumanTransferNote(
      "雅虎竞拍的出价与押金请在袋鼠君小程序内操作（打开该商品出价）。",
    );
  }

  const renderChatItem = (item: ChatItem, key: string) => {
    const amountText = item.orderRef?.amount_rmb
      ? `¥${item.orderRef.amount_rmb}`
      : undefined;
    const jpyText = item.orderRef?.amount
      ? `（约 ${item.orderRef.amount} 日元）`
      : "";
    const canNavigateOrder = Boolean(
      item.orderRef?.order_id && wxReady && isMiniProgramWebview(),
    );

    // 雅虎分流：platform==='yahoo' 且 sale_type 决定模板。
    // 非雅虎（mercari 等）一律走老逻辑，零回归。
    const quote = item.quoteRef;
    const isYahoo = quote?.platform === "yahoo";
    const isYahooAuction = isYahoo && quote?.sale_type === "auction";
    const isYahooSokketsu = isYahoo && quote?.sale_type === "sokketsu";
    // 「去充押金」入口是否可用：仅当配置了充值页 path 才可点。
    const depositRechargeEnabled = Boolean(YAHOO_DEPOSIT_RECHARGE_PAGE_PATH);

    // 已售/不可购报价卡：卡片内底部已有一条「不可购买原因」提示（含「已售」），
    // 文字气泡里的同义开场白会与之重复。此时隐藏上方文字气泡，只留卡片内那一条。
    const isUnpurchasableQuote = Boolean(quote && quote.purchasable === false);
    const showTextBubble = Boolean(item.content) && !isUnpurchasableQuote;

    return (
      <div
        key={key}
        className={`flex flex-col ${
          item.role === "user" ? "items-end" : "items-start"
        }`}
      >
        {showTextBubble ? (
          <div
            className={`max-w-[82%] rounded-lg px-3 py-2 text-sm leading-6 shadow-sm ${
              item.role === "user"
                ? "bg-[#4f67ff] text-white"
                : item.role === "support"
                  ? "border border-orange-100 bg-white text-slate-800"
                  : "bg-white text-slate-800"
            }`}
          >
            {item.role === "support" ? (
              <div className="mb-1 text-[11px] font-medium text-orange-600">
                人工客服
              </div>
            ) : null}
            {item.content}
          </div>
        ) : null}
        {item.orderRef?.order_id ? (
          <div
            className="mt-2 w-[82%] max-w-sm rounded-lg border border-orange-100 bg-white p-3 shadow-sm"
            data-testid="support-order-card"
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <ShoppingBag className="h-4 w-4 text-orange-500" />
              订单信息
            </div>
            {item.orderRef.goods_name ? (
              <div className="line-clamp-2 text-sm leading-5 text-slate-700">
                {item.orderRef.goods_name}
              </div>
            ) : null}
            {amountText ? (
              <div className="mt-2 text-sm font-medium text-slate-900">
                应付金额：{amountText}
                {jpyText ? (
                  <span className="font-normal text-slate-500">{jpyText}</span>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:bg-orange-200"
              onClick={() => openOrderDetail(item.orderRef as OrderRef)}
              disabled={!canNavigateOrder}
            >
              去支付 / 查看订单
            </button>
            {!canNavigateOrder ? (
              <p className="mt-2 text-xs leading-5 text-slate-500">
                请在小程序内打开后查看或支付订单。
              </p>
            ) : null}
          </div>
        ) : null}
        {item.choiceRef?.options?.length ? (
          <div
            className="mt-2 w-[82%] max-w-sm rounded-lg border border-orange-100 bg-white p-3 shadow-sm"
            data-testid="support-choice-card"
          >
            {item.choiceRef.prompt ? (
              <div className="mb-2 text-sm font-medium text-slate-700">
                {item.choiceRef.prompt}
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              {item.choiceRef.options.map((option) =>
                option.label && option.send_text ? (
                  <button
                    key={option.send_text}
                    type="button"
                    className="rounded-md border border-orange-100 bg-orange-50 px-3 py-2 text-left text-sm text-orange-700 disabled:opacity-60"
                    onClick={() => void sendMessage(option.send_text as string)}
                    disabled={loading}
                  >
                    {option.label}
                  </button>
                ) : null,
              )}
            </div>
          </div>
        ) : null}
        {item.quoteRef ? (
          <div
            className="mt-2 w-[82%] max-w-sm rounded-lg border border-orange-100 bg-white p-3 shadow-sm"
            data-testid="support-quote-card"
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Tag className="h-4 w-4 text-orange-500" />
              报价确认
            </div>
            {item.quoteRef.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.quoteRef.cover}
                alt={item.quoteRef.goods_name || "商品图片"}
                className="mb-2 h-32 w-full rounded-md object-cover"
                loading="lazy"
              />
            ) : null}
            {item.quoteRef.goods_name ? (
              <div className="line-clamp-2 text-sm leading-5 text-slate-700">
                {item.quoteRef.goods_name}
              </div>
            ) : null}
            {item.quoteRef.price_jpy !== undefined ? (
              <div className="mt-2 text-sm font-medium text-slate-900">
                现价 ¥{item.quoteRef.price_jpy.toLocaleString("ja-JP")} 日元
              </div>
            ) : null}
            {item.quoteRef.fee_service_jpy !== undefined ? (
              <div className="mt-1 text-xs leading-5 text-slate-500">
                支付手续费：¥
                {item.quoteRef.fee_service_jpy.toLocaleString("ja-JP")} 日元
              </div>
            ) : null}
            {item.quoteRef.fee_agent_jpy !== undefined ? (
              <div className="mt-1 text-xs leading-5 text-slate-500">
                代拍手续费：¥
                {item.quoteRef.fee_agent_jpy.toLocaleString("ja-JP")} 日元
              </div>
            ) : null}
            {item.quoteRef.domestic_shipping_note ? (
              <div className="mt-1 text-xs leading-5 text-slate-500">
                {item.quoteRef.domestic_shipping_note}
              </div>
            ) : null}
            {item.quoteRef.est_goods_rmb ? (
              <div className="mt-2 text-sm font-medium text-slate-900">
                约 ¥{item.quoteRef.est_goods_rmb}
                <span className="font-normal text-slate-500">
                  （不含运费）
                </span>
              </div>
            ) : null}
            {item.quoteRef.rate_note ? (
              <p className="mt-1 text-[11px] leading-4 text-slate-400">
                {item.quoteRef.rate_note}
              </p>
            ) : null}

            {/* ── 可选增值服务区（仅录单流：mercari / 雅虎即決；雅虎竞拍走出价不展示）。
                 买家勾选只前端记录，实际计费在录单环节由 L1/L2/客服处理。 */}
            {!isYahooAuction &&
            item.quoteRef.optional_services &&
            item.quoteRef.optional_services.length > 0 ? (
              <div
                className="mt-3 rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2"
                data-testid="support-quote-optional-services"
              >
                <div className="mb-1.5 text-xs font-medium text-slate-700">
                  可选增值服务（勾选后由客服为您核对计费，现在不扣费）
                </div>
                <div className="space-y-1.5">
                  {item.quoteRef.optional_services.map((svc, svcIndex) => {
                    const svcCode = svc.code || svc.label || `svc-${svcIndex}`;
                    const checked = Boolean(
                      quoteServiceSelections[key]?.[svcCode],
                    );
                    return (
                      <div key={svcCode}>
                        <label className="flex items-start gap-2 text-xs leading-5 text-slate-700">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-orange-500"
                            checked={checked}
                            disabled={Boolean(svc.disabled)}
                            onChange={() => toggleQuoteService(key, svcCode)}
                            data-testid={`support-quote-service-${svcCode}`}
                          />
                          <span className="flex-1">
                            {svc.label || svcCode}
                            {svc.fee_jpy !== undefined ? (
                              <span className="text-slate-500">
                                {" "}
                                ¥{svc.fee_jpy.toLocaleString("ja-JP")} 日元
                              </span>
                            ) : null}
                            {svc.note ? (
                              <span className="block text-[11px] leading-4 text-amber-600">
                                {svc.note}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* ── >5万风险确认卡（卖家核验不达标时显著展示）。
                 仅录单流出卡；买家点确认只前端记录，不录入/不付款/不下单。 */}
            {!isYahooAuction && item.quoteRef.seller_risk?.needs_confirm ? (
              <div
                className="mt-3 rounded-md border border-red-300 bg-red-50 px-2.5 py-2"
                data-testid="support-quote-risk-card"
              >
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-red-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  高额订单风险确认
                </div>
                {(() => {
                  const risk = item.quoteRef!.seller_risk!;
                  const points: string[] =
                    risk.risk_points && risk.risk_points.length > 0
                      ? risk.risk_points
                      : [
                          `卖家本人认证：${
                            risk.identity_verified === true
                              ? "已完成"
                              : risk.identity_verified === false
                                ? "未完成"
                                : "未确认"
                          }`,
                          `卖家评价：${
                            risk.rating_count !== undefined
                              ? `${risk.rating_count} 条`
                              : "未确认"
                          }${
                            risk.rating_percent
                              ? `，好评率 ${risk.rating_percent}`
                              : ""
                          }`,
                        ];
                  return (
                    <ul className="mb-1.5 list-disc space-y-0.5 pl-4 text-[11px] leading-4 text-red-700">
                      {points.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  );
                })()}
                <p className="mb-2 text-[11px] leading-4 text-red-700">
                  {item.quoteRef.seller_risk.disclaimer ||
                    "请确认：一旦平台购买成功，通常不支持因卖家描述、成色差异、个人判断变化等原因退换。若平台或卖家拒绝交易，我们按平台结果处理。"}
                </p>
                {quoteRiskConfirmed[key] ? (
                  <div
                    className="flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] font-medium leading-4 text-emerald-700"
                    data-testid="support-quote-risk-confirmed"
                  >
                    已确认知悉风险，可继续点「我要购买」转人工录入。
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-1 rounded-md bg-red-500 px-3 py-2 text-xs font-medium text-white shadow-sm"
                    onClick={() => confirmQuoteRisk(key)}
                    data-testid="support-quote-risk-confirm-btn"
                  >
                    我已了解风险，继续录入订单
                  </button>
                )}
                <p className="mt-1.5 text-[11px] leading-4 text-red-400">
                  确认前不会录入订单、不会付款、不会自动下单。
                </p>
              </div>
            ) : null}

            {/* 雅虎竞拍：现价/一口价/剩余时间/出价数（缺字段不显示对应行） */}
            {isYahooAuction ? (
              <div
                className="mt-2 space-y-1 rounded-md bg-slate-50 px-2.5 py-2 text-xs leading-5 text-slate-600"
                data-testid="support-quote-auction-info"
              >
                {item.quoteRef.current_bid !== undefined ? (
                  <div className="text-sm font-medium text-slate-900">
                    当前出价 ¥
                    {item.quoteRef.current_bid.toLocaleString("ja-JP")} 日元
                  </div>
                ) : null}
                {item.quoteRef.buyout_jpy !== undefined &&
                item.quoteRef.buyout_jpy > 0 ? (
                  <div>
                    一口价 ¥
                    {item.quoteRef.buyout_jpy.toLocaleString("ja-JP")} 日元
                  </div>
                ) : null}
                {item.quoteRef.left_time ? (
                  <div>剩余时间：{item.quoteRef.left_time}</div>
                ) : null}
                {item.quoteRef.bid_num !== undefined ? (
                  <div>出价数：{item.quoteRef.bid_num}</div>
                ) : null}
              </div>
            ) : null}

            {isYahooAuction ? (
              // 竞拍卡：押金区，不放「立即出价/我要购买/确认录入」（出价走小程序竞拍流程）
              <div className="mt-3" data-testid="support-quote-auction-deposit">
                {item.quoteRef.deposit_state === "ok" ? (
                  <div
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs leading-5 text-emerald-700"
                    data-testid="support-quote-deposit-ok"
                  >
                    押金余额
                    {item.quoteRef.deposit_balance_rmb !== undefined
                      ? `≈¥${item.quoteRef.deposit_balance_rmb.toLocaleString(
                          "zh-CN",
                        )}`
                      : ""}
                    ，本商品可出价上限
                    {item.quoteRef.max_bid_allowed_jpy !== undefined
                      ? `≈¥${item.quoteRef.max_bid_allowed_jpy.toLocaleString(
                          "ja-JP",
                        )}（日元）`
                      : "请回小程序查看"}
                    。
                  </div>
                ) : item.quoteRef.deposit_state === "insufficient" ? (
                  <div
                    className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs leading-5 text-amber-800"
                    data-testid="support-quote-deposit-insufficient"
                  >
                    您暂无足够押金，建议充值
                    {item.quoteRef.suggest_recharge_rmb !== undefined
                      ? `≈¥${item.quoteRef.suggest_recharge_rmb.toLocaleString(
                          "zh-CN",
                        )}`
                      : ""}
                    后参与竞拍。
                    <button
                      type="button"
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:bg-amber-200"
                      onClick={goRechargeDeposit}
                      disabled={!depositRechargeEnabled}
                      data-testid="support-quote-btn-recharge"
                    >
                      {depositRechargeEnabled ? "去充押金" : "充值入口待配置"}
                    </button>
                  </div>
                ) : (
                  <div
                    className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs leading-5 text-slate-500"
                    data-testid="support-quote-deposit-unknown"
                  >
                    登录后可查看你的押金额度。
                  </div>
                )}
                {/* 竞拍卡动作：咨询(预填输入框) + 去出价(跳小程序竞拍详情页,出价/押金小程序专属) */}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-orange-700 shadow-sm disabled:opacity-50"
                    onClick={consultQuote}
                    disabled={loading}
                    data-testid="support-quote-auction-btn-consult"
                  >
                    <MessageCircle className="h-4 w-4" />
                    咨询
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:bg-orange-200"
                    onClick={() => goYahooBid(item.quoteRef?.item_id)}
                    disabled={loading}
                    data-testid="support-quote-auction-btn-bid"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    去出价
                  </button>
                </div>
              </div>
            ) : isYahooSokketsu && item.quoteRef.purchasable !== false ? (
              // 雅虎即決：联系客服下单，不显示自动下单/购买按钮
              <div
                className="mt-3 rounded-md bg-orange-50 px-2.5 py-2 text-xs leading-5 text-orange-700"
                data-testid="support-quote-sokketsu-cta"
              >
                {item.quoteRef.action_hint === "contact_kefu" ||
                !item.quoteRef.action_hint
                  ? item.quoteRef.action_text ||
                    "此商品为即決，请联系客服为您下单。"
                  : item.quoteRef.action_text || "此商品请联系客服处理。"}
              </div>
            ) : item.quoteRef.purchasable === false ? (
              <div
                className="mt-3 flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-medium leading-5 text-red-700"
                data-testid="support-quote-unpurchasable"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {item.quoteRef.unpurchasable_reason || "该商品暂时无法购买"}
              </div>
            ) : (
              (() => {
                // 风险闸：>5万需确认且买家尚未点确认时，禁用「我要购买」，逼买家先确认风险。
                const riskBlocksBuy = Boolean(
                  item.quoteRef!.seller_risk?.needs_confirm &&
                    !quoteRiskConfirmed[key],
                );
                return (
                  <div className="mt-3" data-testid="support-quote-cta">
                    <p className="rounded-md bg-orange-50 px-2.5 py-2 text-xs leading-5 text-orange-700">
                      核对无误后可点下方按钮，或回复『确认』，我为您录入订单。
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="flex items-center justify-center gap-1 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-orange-700 shadow-sm disabled:opacity-50"
                        onClick={consultQuote}
                        disabled={loading}
                        data-testid="support-quote-btn-consult"
                      >
                        <MessageCircle className="h-4 w-4" />
                        咨询
                      </button>
                      <button
                        type="button"
                        className="flex items-center justify-center gap-1 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:bg-orange-200"
                        onClick={() => buyQuote(key, item.quoteRef as QuoteRef)}
                        disabled={loading || riskBlocksBuy}
                        data-testid="support-quote-btn-buy"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        我要购买
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-4 text-slate-400">
                      {riskBlocksBuy
                        ? "请先在上方完成『高额订单风险确认』，再点『我要购买』。"
                        : "点『我要购买』将转人工为您录入订单，不会自动下单或扣款。"}
                    </p>
                  </div>
                );
              })()
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const viewportStyle: CSSProperties = vpRect
    ? {
        position: "fixed",
        top: vpRect.top,
        left: vpRect.left,
        width: vpRect.width,
        height: vpRect.height,
      }
    : { position: "fixed", inset: 0, height: "100dvh" };

  return (
    <main
      className="flex min-h-0 flex-col overflow-hidden bg-[#f5f7fb] text-slate-900"
      style={viewportStyle}
    >
      <header className="sticky top-0 z-10 border-b bg-white/95 px-4 py-3 backdrop-blur">
        <div className="text-center text-base font-semibold">袋鼠酱</div>
        <div className="mt-1 text-center text-xs text-slate-500">
          我先陪你看，复杂问题可能需要一点时间；拿不准的事马上帮你找人工
        </div>
      </header>

      <section className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-4 pt-4">
        {items.map((item, index) => {
          const node = renderChatItem(
            item,
            item.id || `${item.role}-${index}`,
          );
          // 自动报价开场卡紧跟欢迎语（items[0]）渲染，独立于 items：
          // 历史轮询的 setItems 整体替换 items 时永远碰不到它，报价卡稳定留存。
          if (index === 0 && autoQuoteOpening) {
            return (
              <Fragment key="welcome-with-auto-quote">
                {node}
                {renderChatItem(autoQuoteOpening, "auto-quote-opening")}
              </Fragment>
            );
          }
          return node;
        })}

        {pollingError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {pollingError}
          </div>
        ) : null}

        {autoQuoteLoading ? (
          <div className="flex justify-start" data-testid="support-auto-quote-loading">
            <div className="max-w-[82%] rounded-lg border border-orange-100 bg-white px-3 py-2 text-xs leading-5 text-slate-500 shadow-sm">
              正在为您调取该商品信息，请稍等…
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-start">
            <div className="max-w-[82%] rounded-lg border border-orange-100 bg-white px-3 py-2 text-xs leading-5 text-slate-500 shadow-sm">
              {RESPONSE_TIME_NOTE}
            </div>
          </div>
        ) : null}

        {humanTransferVisible ? (
          <div
            className="rounded-lg border border-orange-200 bg-white p-3 shadow-sm"
            data-testid="human-transfer-card"
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-orange-700">
              <Headset className="h-4 w-4" />
              联系人工客服
            </div>
            <p className="text-sm leading-6 text-slate-700">
              {humanTransferNote || HUMAN_TRANSFER_MESSAGE}
            </p>
            <button
              type="button"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm"
              onClick={contactHuman}
              data-testid="contact-human-button"
            >
              <MessageCircle className="h-4 w-4" />
              联系人工客服
            </button>
            {!isMiniProgramWebview() ? (
              <p className="mt-2 flex items-start gap-1 text-xs leading-5 text-slate-500">
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {kf53ChatUrl
                  ? "普通 H5 环境会打开网页人工客服窗口，不会自动携带订单或个人敏感信息。"
                  : "普通 H5 环境无法直接拉起微信客服，请回到袋鼠君小程序后点击人工客服入口。"}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-lg bg-white p-3 shadow-sm">
          <div className="mb-2 text-xs font-medium text-slate-500">
            快捷问题
          </div>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                className="rounded-md border border-orange-100 bg-orange-50 px-2 py-2 text-left text-xs text-orange-700"
                onClick={() => void sendMessage(question)}
                disabled={loading}
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-orange-100 bg-white p-3 text-xs leading-5 text-slate-600">
          <div className="mb-1 flex items-center gap-1 font-medium text-orange-700">
            <UserRoundCheck className="h-4 w-4" />
            袋鼠酱小提醒
          </div>
          袋鼠酱可以先回答代拍流程、费用、物流等常见问题；复杂问题可能需要十几秒整理，请稍等一下。如果遇到退款、改地址、投诉、支付异常，或者需要确认订单的事，我会帮你转给人工客服处理。
        </div>
      </section>

      <form
        onSubmit={submit}
        className="sticky bottom-0 flex shrink-0 gap-2 border-t bg-white px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3"
      >
        <input
          ref={inputRef}
          name="message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
          placeholder="请输入问题"
          maxLength={1000}
        />
        <button
          type="submit"
          className="flex h-10 w-11 items-center justify-center rounded-md bg-orange-500 text-white disabled:bg-orange-200"
          disabled={loading}
          aria-label="发送"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </main>
  );
}
