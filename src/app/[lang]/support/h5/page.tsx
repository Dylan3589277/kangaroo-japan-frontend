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
  HandCoins,
  Headset,
  Loader2,
  MessageCircle,
  MessageSquarePlus,
  ShoppingBag,
  ShoppingCart,
  Send,
  Tag,
  UserRoundCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { getH5UidSignature, getNumericH5UserId } from "./identity";
import { useReviewMode } from "./review-mode";
import { CANDY_THEME_CSS } from "../candy-theme";

type ChatItem = {
  id?: string;
  role: "assistant" | "user" | "support";
  content: string;
  orderRef?: OrderRef;
  quoteRef?: QuoteRef;
  // 批量报价卡（P1：bridge 攒清单回复一次带多件商品）。字段契约 quote_refs（数组），
  // 与单件 quoteRef 互斥优先级：quoteRefs 非空时渲染一组卡，否则回退单卡 quoteRef，零回归。
  quoteRefs?: QuoteRef[];
  choiceRef?: ChoiceRef;
  listRef?: ListRef;
  proxyBuyPayRef?: ProxyBuyPay;
  // 「留言给卖家」结构化卡片（bridge 新增，与 quote_ref 同级）。字段契约见 getLeaveMsgRef。
  leaveMsgRef?: LeaveMsgRef;
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

// 客服两按钮 →「该阶段订单列表卡」。bridge 在 chat 响应 data.list 里下发（与 choice / order_ref 同级）。
// 字段契约见 .team/artifacts/slice34-order-list-card-contract-20260623.md。
// 缺省即不渲染，零回归。
type ListItem = {
  order_id?: string; // string，点击用
  title?: string; // = 后端 goods_name
  status_txt?: string; // 状态文案（如「待入库」）
  amount_rmb?: number; // 人民币（number | null）；JPY 不在此卡
  cover?: string; // 缩略图，可能为空串
  detail_target?: string; // 'order'(小程序订单详情) | 'express'(物流轨迹)
};

type ListRef = {
  stage?: string; // 'warehouse' | 'shipped'
  title?: string; // 标题文案（同 reply）
  items?: ListItem[];
  page?: number;
  total_pages?: number;
  has_prev?: boolean; // page>1
  has_next?: boolean; // page<total_pages
};

// 智能客服辅助购买（CS-Assisted Purchase）待支付卡。bridge 在 chat 响应顶层 emit
// data.proxy_buy_pay（开关 CS_ASSISTED_PURCHASE_ENABLED 默认 OFF 时不会 emit；route.ts 已原样透传）。
// 字段名严格对齐第 2 步 bridge 契约：orderRef/orderNo/goodsNo 为 camelCase，
// amount_jpy/pay_currency/pay_amount/risk_flag 为 snake_case。缺省即不渲染，零回归。
type ProxyBuyPay = {
  type?: string; // 恒 'proxy_buy_pay'
  orderRef?: string; // proxy-buy UUID（支付用）；导航定位订单
  orderNo?: string; // PRX 单号（展示用，可能为 null）
  title?: string; // 商品标题（可能为 null）
  platform?: string; // rakuma / yahoofrima …（可能为 null）
  goodsNo?: string; // 平台商品号（可能为 null）
  amount_jpy?: number; // 应付 JPY 整数（权威，不除以 100）
  pay_currency?: string; // 恒 'CNY'
  pay_amount?: number; // CNY 估算（null 时只显 JPY）
  status?: string; // 恒 'pending_payment'
  risk_flag?: boolean; // true=大额(>5万)，显眼提示核对后支付
};

type QuoteRef = {
  platform?: string;
  item_id?: string;
  // bridge 新增：'auction' 标记煤炉竞拍卡（区别于普通购买卡）。缺省即 undefined，
  // 用于 openQuoteDetail 分流——竞拍品跳小程序详情页会被老后台判成「已售出」。
  kind?: string;
  goods_name?: string;
  goods_name_zh?: string; // bridge 翻译，失败为空
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
  end_at?: string; // 终了时间（ISO，可选，煤炉竞拍新增）
  default_bid_jpy?: number; // 煤炉竞拍新增：默认出价上限（当前价×1.2 取整到百位），最终确认面板默认值
  // 'ok' | 'insufficient' | 'unknown'（雅虎）；'ok' | 'insufficient' | 'no_account' | 'unavailable'（煤炉竞拍新增）
  deposit_state?: string;
  deposit_balance_rmb?: number; // 押金余额（元，仅查到会员时下发）
  deposit_locked_jpy?: number; // 已在拍占用额度（日元，仅查到会员时下发）
  max_bid_allowed_jpy?: number; // 本次可出价上限（日元）
  suggest_recharge_rmb?: number; // 建议充值额（元，仅 insufficient 下发）
  required_cny?: number; // 煤炉竞拍新增：本次所需人民币（展示用）
  register_url?: string; // 煤炉竞拍新增：no_account 时「点我注册」跳转链接（同域 jp-buy.com）
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
  id?: number; // 老后台 st_value_added 主键（数字 id）；建单透传给后端按勾选权威收费
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

// 「留言给卖家」结构化卡片（bridge 新增，与 quote_ref 同级，data/root 两处都可能下发）。
// goods_no 为锚点字段——缺失即视为无效卡片（呼应 getProxyBuyPay 的 orderRef 锚点惯例）。
type LeaveMsgRef = {
  platform?: string;
  goods_no?: string;
  link?: string;
  price_jpy?: number;
  floor_price_jpy?: number;
  prefill_amount_jpy?: number;
  mode_hint?: "bargain" | "consult";
};

type SupportParsedResponse = {
  text: string;
  transferHuman: boolean;
  conversationId?: string;
  queuedForHuman?: boolean;
  orderRef?: OrderRef;
  quoteRef?: QuoteRef;
  quoteRefs?: QuoteRef[];
  choiceRef?: ChoiceRef;
  listRef?: ListRef;
  proxyBuyPayRef?: ProxyBuyPay;
  leaveMsgRef?: LeaveMsgRef;
};

type MiniProgramWindow = Window & {
  wx?: {
    miniProgram?: {
      navigateTo?: (options: { url: string }) => void;
      // tabBar 页（如购物车）不能用 navigateTo，必须 switchTab（微信官方限制）。
      switchTab?: (options: { url: string }) => void;
    };
  };
};

const QUICK_QUESTIONS = [
  // 前 7 个是能力动作位（报价/查单/拍照/留言/押金/竞拍/弃标），其后是秒回 FAQ；
  // 文案须与 bridge FAQ 秒回 pattern / 自助线意图逐字对齐，改动前先核对 bridge 侧。
  "帮我计算价格",
  "帮我查订单物流",
  // 拍照服务入口（花哥 2026-08-07 拍板）：点了直接列出买过【入库前拍照服务】的订单、
  // 可点进订单详情看仓库拍的实物照片；没买过则回服务介绍（顺带当销售位——180 天只有
  // 32 个顾客买过，多数人点了看到的是这句）。
  // 🔴文案约束：含「拍照」才穿得过 route.ts 的 BUSINESS_KEYWORDS 白名单；且必须与
  // bridge 的 PHOTO_ORDER_LIST_TEXT 逐字一致（精确匹配路由，差一个字就掉 Hermes 兜底）。
  "查看拍照服务照片",
  "帮我给卖家留言",
  "押金退款怎么申请？",
  "怎么参与雅虎竞拍？",
  // 弃标入口（花哥 2026-08-07 拍板）：弃标功能上线至今零使用，但雅虎竞拍 30 天有
  // 277 次出价、102 单，需求真实存在。不做"自然说法覆盖"（说法无穷、且「我要弃标」
  // 这类还会被 bridge 判空）——改成按钮，只有真有弃标意向的人才会点，必然命中。
  // 🔴文案两处硬约束，改前必须重验：
  //   ① 必须含「雅虎」或「竞拍」——route.ts 的 BUSINESS_KEYWORDS 白名单里没有
  //      「中标」「弃标」，写成「中标了想弃标」会在前端闸门就被拒、根本到不了 bridge；
  //   ② 必须含「弃标/弃拍/取消/不要了」之一 + 雅虎上下文——bridge
  //      _classify_cancel_intent 两者都要，缺一返回 None（实测「我要弃标」不命中）。
  // 当前文案实测：前端闸门放行（含"雅虎"）+ bridge 判 yahoo_default 进弃标流程。
  "雅虎中标想弃标",
  "代拍费用怎么算？",
  "会产生关税吗？",
  "我要转人工客服",
];

// 「留言给卖家」咨询模式预设问题（花哥拍板 4 条，仅中文——弹窗只在 zh 场景出现）。
// 点击只填入 textarea，不直接提交，买家仍可编辑。
const LEAVE_MSG_PRESET_QUESTIONS = [
  "商品还在吗？",
  "能多拍几张实物照片吗？",
  "有瑕疵或使用痕迹吗？",
  "可以说明一下尺寸/成色吗？",
];

// 2026-08-08 加入 rakuma / yahoofrima：小程序站点详情页点「客服」会带 shop=rakuma 等进来，
// 此前不在集合里 → 下面 sourcePlatform 被强制打回 "mercari" → 拿 rakuma 的商品号去拼煤炉
// 链接，客服识别不出商品，建卡/报价/支付整条链都出不来（花哥真机反馈）。
// 这两个平台的辅助购买链路后端本就支持（ASSISTED_PURCHASE_PLATFORMS）。
// 2026-08-22 加入 cardrush-main（cardrush.jp 主站，区别于宝可梦分站 cardrush）：
// 老后台 Chat.php 已放行该 shop 进 AI 客服，同一白屏风险适用，故同步收进来。
// 2026-08-22 补全其余老后台 Chat.php 白名单里认、但前端此前漏收的平台
// （paypayfleamarket/cardrush/cardmuseum/torecacamp/toretoku/smallbuy/otamart/
// surugaya/zozotown/amiami）：同一道"不在集合里就被打回 mercari"的坑同样适用。
// paypayfleamarket 与 yahoofrima 是同一站点（paypayfleamarket.yahoo.co.jp）的两个
// shop 码——前者是老 PHP 侧的落库/展示码，后者是前端/新链路码，见后端仓
// tcg-quote.service.ts 的 ZH_PRICING_LOCAL_PLATFORM_CODE_REWRITE（yahoofrima→
// paypayfleamarket）——两个都要保留，不能只留一个或合并。
const SUPPORTED_PLATFORMS = new Set([
  "mercari",
  "amazon",
  "yahoo",
  "rakuten",
  "rakuma",
  "yahoofrima",
  "cardrush-main",
  "paypayfleamarket",
  "cardrush",
  "cardmuseum",
  "torecacamp",
  "toretoku",
  "smallbuy",
  "otamart",
  "surugaya",
  "zozotown",
  "amiami",
  "animate",
]);

// cardrush 8 个分站 slug → 域名映射，须与 bridge 侧的映射逐字对应：
// op→cardrush-op.jp, db→cardrush-db.jp, mtg→cardrush-mtg.jp, bs→cardrush-bs.jp,
// digimon→cardrush-digimon.jp, vanguard→cardrush-vanguard.jp, sv→cardrush-sv.jp,
// dm→cardrush-dm.jp。gid 用 `<slug>:<digits>` 前缀标记命中哪个分站。
const CARDRUSH_SUB_SITE_SLUGS = new Set([
  "op",
  "db",
  "mtg",
  "bs",
  "digimon",
  "vanguard",
  "sv",
  "dm",
]);

/** 平台 → 商品页 URL 模板（自动报价时交后端桥识别）。
 *  smallbuy/otamart/zozotown 未收录：后端仓 integrations 里找不到可靠的单段
 *  URL 拼接格式（zozotown 详情页还需要 shop slug，不能只靠 gid 拼），不瞎编——
 *  这几个平台和已有的 amazon/rakuten 一样，SUPPORTED_PLATFORMS 认但没有
 *  builder，效果是自动报价那一下不触发，不影响 sourcePlatform 正确透传。 */
const ITEM_URL_BUILDERS: Record<string, (id: string) => string> = {
  yahoo: (id) => `https://auctions.yahoo.co.jp/jp/auction/${id}`,
  rakuma: (id) => `https://item.fril.jp/${id}`,
  yahoofrima: (id) => `https://paypayfleamarket.yahoo.co.jp/item/${id}`,
  mercari: (id) => `https://jp.mercari.com/item/${id}`,
  "cardrush-main": (id) => {
    const sepIndex = id.indexOf(":");
    if (sepIndex > 0) {
      const slug = id.slice(0, sepIndex);
      const digits = id.slice(sepIndex + 1);
      if (CARDRUSH_SUB_SITE_SLUGS.has(slug) && digits) {
        return `https://www.cardrush-${slug}.jp/product/${digits}`;
      }
    }
    return `https://www.cardrush.jp/product/${id}`;
  },
  paypayfleamarket: (id) => `https://paypayfleamarket.yahoo.co.jp/item/${id}`,
  cardrush: (id) => `https://www.cardrush-pokemon.jp/product/${id}`,
  cardmuseum: (id) => `https://www.card-museum.com/?pid=${id}`,
  torecacamp: (id) => `https://torecacamp-pokemon.com/products/${id}`,
  toretoku: (id) => `https://www.toretoku.jp/item/details/${id}`,
  surugaya: (id) => `https://www.suruga-ya.jp/product/detail/${id}`,
  amiami: (id) => `https://www.amiami.jp/top/detail/detail?gcode=${id}`,
  // 2026-08-22：格式核对自后端仓 animate.service.ts 注释——detail 页真实 "add to cart"
  // 表单 action="/pn/x/pd/<id>/" 里 /pn/<slug>/ 段服务端不校验（字面量 "x" 也能通过），
  // 故直接用 /pn/x/pd/<id>/ 拼，匹配后端 paste-link.controller.ts 的
  // /animate-onlineshop\.jp\/.*\/pd\/\d+/i 正则。
  animate: (id) => `https://www.animate-onlineshop.jp/pn/x/pd/${id}/`,
};

// 辅助购买（zh 灰度）平台：rakuma / yahoofrima / cardrush-main。这些平台的报价卡来自
// bridge _emit_assisted_quote_card（链接→internal/quote），报价时已 _stash_consult_pending
// 暂存商品态。故卡上[我要购买]/[咨询]按钮**回发 bridge 预设文本**走辅助建单/咨询流，
// 而不是像 mercari 那样跳现成网页结算页（那条 type=mercari 结算页认不出 rakuma/
// yahoofrima/cardrush-main 商品 → 白屏「商品不存在」）。文本须与 bridge 常量逐字一致：
//   - [我要购买] → QUOTE_CARD_BUY_TEXT_PREFIX「我要购买此商品」(bridge is_quote_card_buy
//     前缀匹配 → _handle_purchase_intent → 报价确认 → 待支付卡)
//   - [咨询]     → LINK_CHOICE_CONSULT_TEXT「咨询商品」(bridge is_control_text → 咨询
//     ask 分支直接回「请问您想了解这个商品的什么?」)
// 🔴2026-08-22 实测差距：截至本次改动，bridge.py 的 _emit_assisted_quote_card 确认/建单
// 解析仍硬编码 `platform not in ("rakuma", "yahoofrima")`（bridge.py 约5356/5421行），
// 未认 cardrush-main —— 前端加了 cardrush-main 后，[我要购买]/[咨询] 按钮点击会被 bridge
// 400 拒绝。上线前必须同步改 bridge.py 加 cardrush-main，否则这条平台的辅助购买链路仍是断的。
// 2026-08-23 加入 amiami/animate/surugaya/zozotown（真机反馈：贴链接报价卡点[我要购买]
// 落进下方 mercari-only 分支，拿这几个平台的商品号去建 mercari 订单 → 结算页「商品不存在」
// 白屏——与上面 yahoofrima 那次白屏同一种坑）。同样继承上面那条 bridge 硬编码差距：
// bridge.py 的确认/建单白名单未必已认这四个平台，上线前需核对同步（不在本卡范围内，见
// kjb-wt-paste-sites 施工单 A3 只加了日志行，未改这处白名单）。
// 2026-08-23 再加 cardrush（cardrush-pokemon.jp）/cardmuseum/torecacamp/toretoku：
// bridge 已同步支持识别这几种链接的报价卡，同一条"不在集合里就落进 mercari-only 分支"
// 的坑同样适用，不加会重演上面几次白屏。
const ASSISTED_PURCHASE_PLATFORMS = new Set([
  "rakuma",
  "yahoofrima",
  "cardrush-main",
  "amiami",
  "animate",
  "surugaya",
  "zozotown",
  "cardrush",
  "cardmuseum",
  "torecacamp",
  "toretoku",
]);
// 与 bridge.py 常量逐字一致（改这里务必同步改 bridge）：
const ASSISTED_BUY_INTENT_TEXT = "我要购买此商品";
const ASSISTED_CONSULT_TEXT = "咨询商品";

// 批量报价卡（如「去支付」命中多件商品）场景下，续聊分支 sendMessage 的 body 只发
// {content}（见 sendMessage 实现，conversationId 存在时 extra 不透传），bridge 无法从
// 固定文本区分点的是哪一件。故对辅助购买平台（rakuma/yahoofrima）在按钮文本末尾追加
// 商品标记 ` [#<platform>:<item_id>]`，bridge 侧解析该后缀定位具体商品（契约已与 bridge
// 分身同步）。platform/item_id 任一缺失时返回空串，调用方按原文本发送，向后兼容。
function buildAssistedQuoteMarker(quote?: QuoteRef): string {
  if (!quote?.platform || !ASSISTED_PURCHASE_PLATFORMS.has(quote.platform)) {
    return "";
  }
  if (!quote.item_id) return "";
  return ` [#${quote.platform}:${quote.item_id}]`;
}
const HUMAN_TRANSFER_MESSAGE =
  "袋鼠酱这边暂时有点忙，我先带你转人工客服继续处理～";
const RESPONSE_TIME_NOTE =
  "我会尽量快点回复；复杂问题可能需要十几秒整理，请稍等一下。";
const MINI_PROGRAM_REAL_KEFU_PATH = "/pages/bundle/realkefu/realkefu";
// 默认走企业微信客服链接，env 可覆盖。env 名沿用历史名 KF53，保留是为了不破坏既有配置。
const WECOM_KEFU_CHAT_URL =
  process.env.NEXT_PUBLIC_KF53_CHAT_URL ||
  "https://work.weixin.qq.com/kfid/kfcdd40f1f6c4b4b499";
// 竞拍（雅虎/煤炉）押金不足时「去充押金」跳转的小程序充值页 path。
// 默认走袋鼠君小程序现有充值页 /pages/daishujun/index/pay（pay.vue onLoad 读 p.type/p.money），
// 拼参 type=deposit&money=<建议充值 CNY 整数>；env 仍可覆盖为专用 path。
const YAHOO_DEPOSIT_RECHARGE_PAGE_PATH =
  process.env.NEXT_PUBLIC_YAHOO_DEPOSIT_RECHARGE_PAGE_PATH ||
  "/pages/daishujun/index/pay";
// 智能客服辅助购买待支付卡「去支付」跳转的小程序代拍待支付页 path。
// proxy-buy 订单是新库 UUID 体系（≠ 旧库 numeric orderDetail），故不复用 orderDetail?id= 这条旧库路径，
// 改用专门的环境变量占位（同 YAHOO_DEPOSIT_RECHARGE_PAGE_PATH 的处理法）：
// 真实 path（小程序代拍订单/支付页）待花哥/小程序侧给，未配置时按钮禁用并显示「支付入口待配置」，
// 绝不写死可能错的 path、绝不在客服 H5 直接调 JWT-required 的 newage/create-payment（那需现代登录态，客服 H5 只有 uid 无 JWT）。
const PROXY_BUY_PAY_PAGE_PATH =
  process.env.NEXT_PUBLIC_PROXY_BUY_PAY_PAGE_PATH || "";

const WELCOME_ITEM: ChatItem = {
  role: "assistant",
  content:
    "亲亲你好呀～我是袋鼠酱，这些我都能直接帮你办：\n💰 发商品链接，秒算价格、帮你下单/竞拍出价\n📦 查订单状态、物流到哪了\n💬 帮你给卖家留言、砍价\n💳 押金退款申请与查询\n💡 费用、关税、时效等常见问题秒回\n遇到需要人工确认的事，我会马上带你去找客服同事～",
};

// 活动内容配置化（P0-1c，2026-08-06）：欢迎语挂载的活动 teaser 改为从 bridge 拉取
// （见 loadWelcomeTeaser 副作用），不再和客服话术库分裂维护。teaser 拼在固定的
// WELCOME_ITEM 正文之后；拿不到（未加载/超时/失败/空值）时 extra 传空串，原样
// 回落纯文本欢迎语，零回归。
function buildWelcomeItem(extra: string): ChatItem {
  if (!extra) return WELCOME_ITEM;
  return { ...WELCOME_ITEM, content: `${WELCOME_ITEM.content}\n${extra}` };
}

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
      id: getNumber(r.id),
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
    kind: getString(record.kind),
    goods_name: goodsName,
    goods_name_zh: getString(record.goods_name_zh),
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
    end_at: getString(record.end_at),
    default_bid_jpy: getNumber(record.default_bid_jpy),
    deposit_state: getString(record.deposit_state),
    deposit_balance_rmb: getNumber(record.deposit_balance_rmb),
    deposit_locked_jpy: getNumber(record.deposit_locked_jpy),
    max_bid_allowed_jpy: getNumber(record.max_bid_allowed_jpy),
    suggest_recharge_rmb: getNumber(record.suggest_recharge_rmb),
    required_cny: getNumber(record.required_cny),
    register_url: getString(record.register_url),
    // 可选服务 / 卖家风险：缺省即 undefined，前端按存在性渲染（零回归）。
    optional_services: getOptionalServices(record.optional_services),
    seller_risk: getSellerRisk(record.seller_risk),
  };
}

// 批量报价卡：解析 quote_refs 数组（每项与单件 quote_ref 同构）。空数组/非数组/全部
// 解析失败时返回 undefined，让上层回退到单件 quoteRef 分支，零回归。
function getQuoteRefs(value: unknown): QuoteRef[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: QuoteRef[] = [];
  for (const raw of value) {
    const q = getQuoteRef(raw);
    if (q) out.push(q);
  }
  return out.length ? out : undefined;
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

function getListItem(value: unknown): ListItem | undefined {
  const r = getRecord(value);
  const orderId = getString(r.order_id);
  // 没有 order_id 的条目无法点击/翻页定位，丢弃。
  if (!orderId) return undefined;
  return {
    order_id: orderId,
    title: getString(r.title),
    status_txt: getString(r.status_txt),
    amount_rmb: getNumber(r.amount_rmb),
    cover: getString(r.cover),
    detail_target: getString(r.detail_target),
  };
}

function getListRef(value: unknown): ListRef | undefined {
  const record = getRecord(value);
  if (!Array.isArray(record.items)) return undefined;
  const items: ListItem[] = [];
  for (const raw of record.items) {
    const item = getListItem(raw);
    if (item) items.push(item);
  }
  // 没有可渲染条目就不当列表卡（空列表分支由 bridge 走普通文字气泡，无 list 字段）。
  if (!items.length) return undefined;
  return {
    stage: getString(record.stage),
    title: getString(record.title),
    items,
    page: getNumber(record.page),
    total_pages: getNumber(record.total_pages),
    has_prev: getBoolean(record.has_prev),
    has_next: getBoolean(record.has_next),
  };
}

// 智能客服辅助购买待支付卡解析。仅当后端真的下发 proxy_buy_pay 且带可支付定位（orderRef）才返回，
// 否则不渲染（开关 OFF 时 bridge 根本不 emit，这里天然得 undefined，零回归）。
function getProxyBuyPay(value: unknown): ProxyBuyPay | undefined {
  const r = getRecord(value);
  const orderRef = getString(r.orderRef);
  // 没有 orderRef（支付用 UUID）无法定位订单/去支付——不渲染待支付卡，避免出一张点了没用的卡。
  if (!orderRef) return undefined;
  return {
    type: getString(r.type),
    orderRef,
    orderNo: getString(r.orderNo),
    title: getString(r.title),
    platform: getString(r.platform),
    goodsNo: getString(r.goodsNo),
    amount_jpy: getNumber(r.amount_jpy),
    pay_currency: getString(r.pay_currency),
    pay_amount: getNumber(r.pay_amount),
    status: getString(r.status),
    risk_flag: getBoolean(r.risk_flag),
  };
}

// 「留言给卖家」结构化卡片解析。goods_no 为锚点字段（呼应 getProxyBuyPay 的 orderRef 惯例）——
// 缺失/类型不对一律返回 undefined，不渲染空卡。mode_hint 只认白名单两个值，其余当未提供。
function getLeaveMsgRef(value: unknown): LeaveMsgRef | undefined {
  const r = getRecord(value);
  const goodsNo = getString(r.goods_no);
  if (!goodsNo) return undefined;
  const modeHintRaw = getString(r.mode_hint);
  const modeHint =
    modeHintRaw === "bargain" || modeHintRaw === "consult"
      ? modeHintRaw
      : undefined;
  return {
    platform: getString(r.platform),
    goods_no: goodsNo,
    link: getString(r.link),
    price_jpy: getNumber(r.price_jpy),
    floor_price_jpy: getNumber(r.floor_price_jpy),
    prefill_amount_jpy: getNumber(r.prefill_amount_jpy),
    mode_hint: modeHint,
  };
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
  const quoteRefs = getQuoteRefs(data.quote_refs || root.quote_refs);
  const choiceRef = getChoiceRef(data.choice || root.choice);
  const listRef = getListRef(data.list || root.list);
  const proxyBuyPayRef = getProxyBuyPay(
    data.proxy_buy_pay || root.proxy_buy_pay,
  );
  const leaveMsgRef = getLeaveMsgRef(
    data.leave_msg_ref || root.leave_msg_ref,
  );

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
    quoteRefs,
    choiceRef,
    listRef,
    proxyBuyPayRef,
    leaveMsgRef,
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

// PC 端微信内置浏览器（WindowsWechat / MacWechat）：这里的小程序 webview 桥
// (wx.miniProgram.navigateTo) 行为不可靠 —— PC 微信打开的小程序 webview 跳转人工
// 客服页常失败或空白。故 PC 微信一律走企业微信客服兜底，不依赖小程序桥。
function isPcWechat() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return ua.includes("WindowsWechat") || ua.includes("MacWechat");
}

function isMobileWechat() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /MicroMessenger/i.test(ua) && !isPcWechat();
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

// 智能客服辅助购买待支付卡「去支付」：mirror navigateToMiniProgramOrderDetail 的同款机制
// （wx.miniProgram.navigateTo 跳袋鼠君小程序内顾客已登录的页，由小程序侧用本人登录态完成付款），
// 但 proxy-buy 订单是新库 UUID，目标页用 PROXY_BUY_PAY_PAGE_PATH（占位 env）而非旧库 orderDetail。
// 付款是顾客自己的动作（代客只到建单为止），客服 H5 不直接调 JWT-required 收款端点。
// path 未配置时返回 false → 调用方按钮禁用 / 兜底提示，绝不跳错页。
function navigateToMiniProgramProxyBuyPay(orderId: string) {
  if (!PROXY_BUY_PAY_PAGE_PATH) return false;
  if (typeof window === "undefined") return false;
  const win = window as MiniProgramWindow;
  if (!win.wx?.miniProgram?.navigateTo) return false;
  const joiner = PROXY_BUY_PAY_PAGE_PATH.includes("?") ? "&" : "?";
  win.wx.miniProgram.navigateTo({
    url: `${PROXY_BUY_PAY_PAGE_PATH}${joiner}id=${encodeURIComponent(orderId)}`,
  });
  return true;
}

// 列表卡「已出仓」条目 → 跳袋鼠君小程序物流轨迹页。
// 路径依据 daishujunApp/pages/daishujun/mine/express.vue：onLoad(e) 读 e.id，param 名是 `id`，
// 该页用 id 调 api/orders/express 自行拉取物流公司/单号（name/code 可省略）。
function navigateToMiniProgramExpress(orderId: string) {
  if (typeof window === "undefined") return false;
  const win = window as MiniProgramWindow;
  if (!win.wx?.miniProgram?.navigateTo) return false;
  win.wx.miniProgram.navigateTo({
    url: "/pages/daishujun/mine/express?id=" + encodeURIComponent(orderId),
  });
  return true;
}

// 小程序内「我要购买」：直接跳袋鼠君小程序的 confirm 结算页（type=mercari）。
// 原先跳 mercari_detail 是为了借它的 confirmOrder() 登录守卫；现在小程序 request 层已
// 统一处理登录态（自动记录返回路径、code 101 时跳登录），confirm 页本身也带守卫，
// 无需再绕道详情页。valueAddedIds 是逗号分隔的增值服务 id（st_value_added 主键），
// 透传给 confirm.vue 的 onLoad 用于预选服务（小程序侧由另一分身同步）。
function navigateToMiniProgramBuy(itemId: string, valueAddedIds?: string) {
  if (typeof window === "undefined") return false;
  const win = window as MiniProgramWindow;
  if (!win.wx?.miniProgram?.navigateTo) return false;
  let url = "/pages/daishujun/index/confirm?type=mercari&id=" + encodeURIComponent(itemId);
  if (valueAddedIds) {
    url += "&values=" + encodeURIComponent(valueAddedIds);
  }
  win.wx.miniProgram.navigateTo({ url });
  return true;
}

// 报价卡「加入购物车」：跳袋鼠君小程序该商品的详情页，由详情页现成的
// [加入购物车] 按钮完成加购（用顾客本人登录态，客服 H5 不直接调 carts/addcart 接口）。
// mercari 详情页是独立页面：依据 daishujunApp-cardD/pages/daishujun/index/mercari_detail.vue
//   onLoad(e)（第 313-314 行）只读 e.id，无 platform 参数，path 为主包页面
//   "pages/daishujun/index/mercari_detail"（daishujunApp-cardD/pages.json 第 114 行）。
// rakuma / yahoofrima 共用通用商品页：依据
//   daishujunApp-cardD/pages/bundle/sites/detail.vue onLoad(e)（第 324-326 行）读
//   e.platform + e.id，path 为 subPackages root "pages/bundle" + "sites/detail"
//   （daishujunApp-cardD/pages.json 第 571 行 root、第 658 行 path）。
function navigateToMiniProgramGoodsDetail(platform: string, itemId: string) {
  if (typeof window === "undefined") return false;
  const win = window as MiniProgramWindow;
  if (!win.wx?.miniProgram?.navigateTo) return false;
  const url =
    platform === "mercari"
      ? "/pages/daishujun/index/mercari_detail?id=" + encodeURIComponent(itemId)
      : "/pages/bundle/sites/detail?platform=" +
        encodeURIComponent(platform) +
        "&id=" +
        encodeURIComponent(itemId);
  win.wx.miniProgram.navigateTo({ url });
  return true;
}

// 报价卡「支付」（rakuma/yahoofrima 三等分场景）：跳袋鼠君小程序购物车页统一结算。
// cart 是 tabBar 页（daishujunApp-cardD/pages.json tabBar list 含
// pages/daishujun/index/cart），webview 跳 tabBar 页必须用 switchTab（navigateTo 会失败）。
function navigateToMiniProgramCart() {
  if (typeof window === "undefined") return false;
  const win = window as MiniProgramWindow;
  if (!win.wx?.miniProgram?.switchTab) return false;
  win.wx.miniProgram.switchTab({ url: "/pages/daishujun/index/cart" });
  return true;
}

// 报价卡「支付」（rakuma/yahoofrima）：跳袋鼠君小程序现成的确认订单页
// pages/bundle/sites/confirm（花哥 2026-08-14 拍板：与 mercari 确认单页同构，
// 商品卡+费用明细+提交订单）。参数契约对齐 sites/detail.vue handleBuy（第 469-476 行）：
// platform + goods_no + pname(平台显示名，confirm.vue onLoad 缺省回落 platform 码)。
const SITES_CONFIRM_PNAME: Record<string, string> = {
  rakuma: "拉库玛",
  yahoofrima: "Yahoo!フリマ",
  amiami: "AmiAmi",
  animate: "Animate",
  surugaya: "骏河屋",
  zozotown: "ZOZOTOWN",
};
function navigateToMiniProgramSitesConfirm(
  platform: string,
  goodsNo: string,
  valueAddedIds?: string,
) {
  if (typeof window === "undefined") return false;
  const win = window as MiniProgramWindow;
  if (!win.wx?.miniProgram?.navigateTo) return false;
  let url =
    "/pages/bundle/sites/confirm?platform=" +
    encodeURIComponent(platform) +
    "&goods_no=" +
    encodeURIComponent(goodsNo) +
    "&pname=" +
    encodeURIComponent(SITES_CONFIRM_PNAME[platform] || platform);
  if (valueAddedIds) {
    url += "&values=" + encodeURIComponent(valueAddedIds);
  }
  win.wx.miniProgram.navigateTo({ url });
  return true;
}

// 小程序内「去出价」：跳袋鼠君小程序的雅虎竞拍详情页（出价/押金在该页操作）。
// 老版路径依据 daishujunApp/pages/daishujun/index/yahoo_detail.vue：onLoad(e) 读 e.id，param 名是 `id`。
// candy 宿主（useCandyTransfer=true，判据同 isCandyTheme）没有 yahoo_detail 页，改跳中转页
// /pages/bundle/transfer/auction（onLoad 同样读 id），老版行为零变化。
function navigateToMiniProgramYahooBid(itemId: string, useCandyTransfer: boolean) {
  if (typeof window === "undefined") return false;
  const win = window as MiniProgramWindow;
  if (!win.wx?.miniProgram?.navigateTo) return false;
  const url = useCandyTransfer
    ? "/pages/bundle/transfer/auction?id=" + encodeURIComponent(itemId)
    : "/pages/daishujun/index/yahoo_detail?id=" + encodeURIComponent(itemId);
  win.wx.miniProgram.navigateTo({ url });
  return true;
}

// moneyRmb：建议充值额（元）。传给 pay.vue 的 money 参数须为 ≥1 的整数，缺失/非法时兜底 1，
// 绝不传 0 或小数（pay.vue 按此参数发起充值）。
function navigateToMiniProgramDepositRecharge(moneyRmb?: number) {
  if (!YAHOO_DEPOSIT_RECHARGE_PAGE_PATH) return false;
  if (typeof window === "undefined") return false;
  const win = window as MiniProgramWindow;
  if (!win.wx?.miniProgram?.navigateTo) return false;
  const money = Math.max(1, Math.round(moneyRmb ?? 1) || 1);
  const joiner = YAHOO_DEPOSIT_RECHARGE_PAGE_PATH.includes("?") ? "&" : "?";
  win.wx.miniProgram.navigateTo({
    url: `${YAHOO_DEPOSIT_RECHARGE_PAGE_PATH}${joiner}type=deposit&money=${money}`,
  });
  return true;
}

function getWecomKefuChatUrl() {
  const rawUrl = WECOM_KEFU_CHAT_URL.trim();
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

// 糖果橙皮（新版小程序 webview 用 ?theme=candy 拼进 URL 换肤，老小程序不带参数=零变化）。
// 页面本身固定用 Tailwind 默认 orange-* 调色板 + 页面底 #f5f7fb；这里用
// [data-theme="candy"] 祖先选择器覆盖这些 utility class 编译出的固定颜色，
// 不改任何组件结构/逻辑，老皮（无 data-theme 属性）零变化。
// 色值：主色 #EF8632 / 深 #D96E1E / 浅底 #FFF0E0 / 页面底 #FFFBF5 / 文字墨色 #4A3426。

export default function MiniProgramSupportH5Page() {
  const params = useParams<{ lang?: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = params?.lang || "zh";
  // 小程序送审期间老后台「审核模式」开关：true 时隐藏一切竞拍相关内容。
  // loading 期间三个竞拍按钮先不渲染（防审核模式下闪现），失败按 false（不隐藏）处理。
  const { loading: reviewModeLoading, reviewMode } = useReviewMode();
  // 新版小程序换肤参数：?theme=candy。缺省/其它值一律按原皮渲染，零回归。
  const isCandyTheme = searchParams.get("theme") === "candy";
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
  // 活动 teaser（P0-1c）：挂载时异步拉取，用 ref 而非 state 存最新值——
  // loadConversationMessages 在闭包里按需读 .current，不用把它加进依赖数组
  // 触发额外重订阅；到达时机不确定（可能早于/晚于历史轮询启动），ref 保证
  // 两条路径（下方 fetch 副作用 / loadConversationMessages）永远读到同一个值。
  const welcomeTeaserRef = useRef("");
  // 聊天输入框 ref：报价卡"咨询"按钮点了之后聚焦输入框，让买家自己打字提问。
  const inputRef = useRef<HTMLInputElement | null>(null);
  // 消息列表滚动容器 + 底部锚点：新消息到达时若买家本就贴着底部，则平滑滚到底部；
  // 若买家正往上翻看历史消息，则不打扰（不做"推顶"式强制滚动）。
  const messagesSectionRef = useRef<HTMLElement | null>(null);
  const messagesBottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  // 点过报价卡【咨询商品】后的追问窗口期（毫秒时间戳，未来则窗口期内）。
  // 与 bridge 侧 ASSISTED_CONSULT_TTL（600s _consult_pending 会话态）对齐：
  // 窗口期内的下一条消息（不管按钮点的还是买家手打）都在请求体带 consult_active:true，
  // 放行 BFF 闸门直达 bridge，避免"是否包邮"这类追问因不含 BUSINESS_KEYWORDS 被兜底话术顶回。
  const consultActiveUntilRef = useRef(0);
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
  // 煤炉竞拍「确认竞拍」最终确认面板：mercariBidConfirmingItemId 记录正在展开面板的
  // item_id（null=都收起）；mercariBidAmountInputs 记录各 item_id 当前输入的出价金额。
  const [mercariBidConfirmingItemId, setMercariBidConfirmingItemId] = useState<
    string | null
  >(null);
  const [mercariBidAmountInputs, setMercariBidAmountInputs] = useState<
    Record<string, string>
  >({});
  // 「留言给卖家」弹窗（砍价/咨询）：leaveMsgTarget 非空即弹窗展开，记录目标报价卡；
  // 关闭/提交成功后统一清空，下次打开都是干净初始态。
  const [leaveMsgTarget, setLeaveMsgTarget] = useState<{
    cardKey: string;
    quote: QuoteRef;
    // 来自 leaveMsgRef 结构化卡片的上下文透传（QuoteRef 无这两个字段，故不塞进 quote，
    // 避免污染该类型）：floorPriceJpy 覆盖砍价底线默认的 80% 算法；link 供「查看商品」用。
    floorPriceJpy?: number;
    link?: string;
  } | null>(null);
  const [leaveMsgType, setLeaveMsgType] = useState<
    "bargain" | "question" | null
  >(null);
  const [leaveMsgTargetPrice, setLeaveMsgTargetPrice] = useState("");
  const [leaveMsgQuestionText, setLeaveMsgQuestionText] = useState("");
  const [leaveMsgSubmitting, setLeaveMsgSubmitting] = useState(false);
  const [leaveMsgError, setLeaveMsgError] = useState("");
  const wecomKefuChatUrl = getWecomKefuChatUrl();

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
      setItems([buildWelcomeItem(welcomeTeaserRef.current), ...serverItems]);
      setPollingError("");
    } catch {
      setPollingError("消息同步暂时失败，请稍后重试或联系人工客服。");
    }
  }, [conversationId]);

  // 活动 teaser 拉取（P0-1c，2026-08-06）：挂载时短超时（3s）请求 bridge 的
  // /v1/customer-service/welcome（经同源代理 /api/support/welcome，浏览器不能
  // 直连内网 bridge），成功且非空才把 teaser 拼进欢迎语；失败/超时/空值一律
  // 静默回落现有纯文本欢迎语（fail-safe，本仓惯例），不弹错误、不阻塞聊天。
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3000);
    (async () => {
      try {
        const response = await fetch("/api/support/welcome", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = await response.json().catch(() => null);
        const teaser = getString(getRecord(payload).promo_teaser);
        if (!teaser) return;
        welcomeTeaserRef.current = teaser;
        setItems((current) =>
          current.map((item, index) =>
            index === 0 && item.role === "assistant"
              ? buildWelcomeItem(teaser)
              : item,
          ),
        );
      } catch {
        // 超时/网络失败：静默回落纯文本欢迎语，零回归。
      } finally {
        window.clearTimeout(timer);
      }
    })();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
    // 仅挂载时跑一次（effect 内只用到稳定的 setItems / 局部变量，无需依赖数组）。
  }, []);

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
    //
    // 🔴2026-08-13 修复「新消息到达时聊天列表被剧烈推顶、标题顶到屏幕中部、大片空白且持续
    // 很久」（客服真机反馈）：根因不是 scrollIntoView/scrollTop（本文件压根没有），而是这个
    // 钉位效果本身——它不加区分地信任每一次 visualViewport resize/scroll 事件的 offsetTop。
    // 新消息到达时若正巧键盘还开着，浏览器为把聚焦的输入框保持可见会做原生滚动调整，期间
    // visualViewport 会连续触发多次带噪声/过渡态 offsetTop 的事件；旧代码把每一次都当真、
    // 立即整体挪动含标题在内的 fixed 容器，于是观感就是标题被顶飞、露出大片空白，且要等这串
    // 事件抖动完才安定下来（"持续很久"）。
    // 修法：① 只有 viewport.height 明显小于 window.innerHeight（判定键盘确实弹出）时才钉位，
    // 否则一律回退默认布局（height:100dvh，见 viewportStyle），不被无关的 resize/scroll 噪声
    // 牵着走；② 用 rAF 合并同一帧内的多次事件，避免连续触发多次 setState 造成画面抖动。
    const KEYBOARD_HEIGHT_THRESHOLD = 120; // px，明显小于常见地址栏高度变化，避免误判
    let rafId = 0;
    const updateRect = () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        if (!viewport) {
          setVpRect(null);
          return;
        }
        const keyboardLikelyOpen =
          window.innerHeight - viewport.height > KEYBOARD_HEIGHT_THRESHOLD;
        if (!keyboardLikelyOpen) {
          setVpRect(null);
          return;
        }
        setVpRect({
          top: Math.round(viewport.offsetTop),
          left: Math.round(viewport.offsetLeft),
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
        });
      });
    };

    updateRect();
    viewport?.addEventListener("resize", updateRect);
    viewport?.addEventListener("scroll", updateRect);
    window.addEventListener("resize", updateRect);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      viewport?.removeEventListener("resize", updateRect);
      viewport?.removeEventListener("scroll", updateRect);
      window.removeEventListener("resize", updateRect);
    };
  }, []);

  // 追踪买家是否本就贴着消息列表底部（阈值 80px，容忍 iOS 惯性滚动的抖动）。
  // 只用来决定"新消息到达要不要跟着滚"，不主动触发任何滚动。
  useEffect(() => {
    const section = messagesSectionRef.current;
    if (!section) return;
    const handleScroll = () => {
      const distanceFromBottom =
        section.scrollHeight - section.scrollTop - section.clientHeight;
      stickToBottomRef.current = distanceFromBottom < 80;
    };
    section.addEventListener("scroll", handleScroll, { passive: true });
    return () => section.removeEventListener("scroll", handleScroll);
  }, []);

  // 新消息到达（items / 自动报价卡 / loading 提示变化）时，仅当买家本就贴着底部才平滑
  // 滚到最新一条；买家正翻看历史消息时不打扰。这是本文件唯一的"跟随新消息滚动"逻辑——
  // 之前没有任何 scrollIntoView/scrollTop，聊天列表完全依赖浏览器原生行为，新消息到达时
  // 不会自动跟到底部；加上这段后新消息平滑置底、不再需要靠"钉住可视区"的副作用间接顶动
  // 整个容器（那正是"剧烈推顶/大片空白"的根因，见上方 visualViewport effect 里的说明）。
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    messagesBottomAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [items, autoQuoteOpening, loading, autoQuoteLoading]);

  // 自动报价：仅挂载时执行一次。从 mercari/yahoo 商品页（带 ?gid=xxx&shop=yyy）进客服时，
  // 零输入地用商品链接拉一次报价，把 assistant 回复 + 报价卡作为开场消息渲染，
  // 但**不**追加 user 角色气泡（不显示"用户发了一条链接"）。失败则静默，不影响正常聊天。
  useEffect(() => {
    if (autoQuoteTriggeredRef.current) return;
    // mercari 与 yahoo（即決+竞拍）从商品页进客服都自动弹卡；其它平台仍不触发。
    // 2026-08-08 放开 rakuma/yahoofrima：这两个平台的报价卡由 bridge 的
    // _emit_assisted_quote_card 走 internal/quote 出卡，链路本就支持，此前被这道门挡住
    // 导致从站点商品页进客服拿不到报价卡/建单/支付（花哥真机反馈）。
    if (!sourceGoodsId || !ITEM_URL_BUILDERS[sourcePlatform]) return;
    // 🔴2026-08-13 修复「从商品页进客服，不自动出现该商品的报价卡」（客服实测①-1；bridge
    // 侧确认全程从未收到过带 gid 的商品链接消息，排除是 bridge 没处理——问题在这道门本身）。
    // 旧逻辑「已有 conversationId 就不再自动报价」的本意是防「同一商品页刷新」重复发送，
    // 但小程序 webview 在同一次客服会话里连续从多个商品页进来时会带着同一个 conversationId
    // （会话是延续的，不是每个商品一个新会话），于是买家换了商品、带着新的 gid 进来，也会被
    // 这道门直接拦下——请求压根没发出去，报价卡自然不会出现。
    // 改为按「平台+商品号」维度去重（sessionStorage，跨整页导航持久、关标签页即失效）：
    // 同一件商品在本次浏览器会话里只自动报价一次，换成不同商品则正常触发，不再被
    // conversationId 是否存在这个无关信号挡住。
    const autoQuoteDedupeKey = `kj_h5_autoquoted_${sourcePlatform}_${sourceGoodsId}`;
    // 2026-08-22 花哥令：去重值从固定 "1" 改存时间戳，超过 30 分钟视为过期重新报价。
    // 老版小程序 webview 里 sessionStorage 长期不清（同一会话可能开好几个小时），旧的
    // "永久去重"写法导致同一商品第二次进客服再也不出报价卡。读到旧格式 "1"（parseInt
    // 后是极小的时间戳，离 Date.now() 必然超过 30 分钟）也自然落入"过期"分支，无需
    // 额外特判，向前兼容。
    const AUTO_QUOTE_DEDUPE_TTL_MS = 30 * 60 * 1000;
    try {
      if (typeof window !== "undefined") {
        const storedAt = Number.parseInt(
          window.sessionStorage.getItem(autoQuoteDedupeKey) ?? "",
          10,
        );
        if (
          Number.isFinite(storedAt) &&
          Date.now() - storedAt < AUTO_QUOTE_DEDUPE_TTL_MS
        ) {
          return;
        }
      }
    } catch {
      // sessionStorage 不可用（隐私模式/小程序 webview 限制等）：退化为不去重，
      // 宁可偶尔对同一商品重复报价，也不能因此完全失去自动报价能力。
    }
    autoQuoteTriggeredRef.current = true;
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(autoQuoteDedupeKey, String(Date.now()));
      }
    } catch {
      // 写入失败不影响本次请求正常发出，仅去重退化。
    }

    // 按平台拼商品 URL，交后端桥识别出卡（yahoo 即決+竞拍都支持）。
    const itemUrl = (
      ITEM_URL_BUILDERS[sourcePlatform] || ITEM_URL_BUILDERS.mercari
    )(sourceGoodsId);
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
        // 拿到报价卡，或批量购买流的结构化回复（核价文本+choice 按钮，bridge
        // batch_purchase_item_added 不带 quote_ref），都算有效开场卡；转人工/纯兜底
        // 文案仍静默（parsed.text 有默认值永不为空，不能单独作条件，防误转人工）。
        // 写进独立的 autoQuoteOpening state（不进 items），渲染在列表最上方，
        // 这样后续历史轮询的 setItems 整体替换永远冲不掉它。
        // 合并两路修复(2026-08-13):卡C 的 quoteRefs 数组 + 另一会话的
        // 「choice 回包也算有效开场卡」放宽——三者任一即出卡,载荷三个都带。
        if (
          parsed.quoteRef ||
          parsed.quoteRefs ||
          (!parsed.transferHuman && parsed.choiceRef?.options?.length)
        ) {
          setAutoQuoteOpening({
            role: "assistant",
            content: parsed.text || "已为您调取该商品信息：",
            quoteRef: parsed.quoteRef,
            quoteRefs: parsed.quoteRefs,
            choiceRef: parsed.choiceRef,
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

  // extra：随购买意图等场景附带的结构化字段（如 selected_value_added_ids），
  // 仅在首条 /api/support/chat 请求体里透传（会话内 /messages 端点只收 content，不带）。
  async function sendMessage(
    message: string,
    extra?: Record<string, unknown>,
  ) {
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
            ...(Date.now() < consultActiveUntilRef.current
              ? { consult_active: true }
              : {}),
            ...(extra ?? {}),
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
            quoteRefs: parsed.quoteRefs,
            choiceRef: parsed.choiceRef,
            listRef: parsed.listRef,
            proxyBuyPayRef: parsed.proxyBuyPayRef,
            leaveMsgRef: parsed.leaveMsgRef,
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
    // PC 微信（WindowsWechat/MacWechat）跳过不可靠的小程序桥，直接走企业微信客服。
    // 非 PC 微信（移动端小程序 webview）仍优先跳小程序内人工客服页。
    if (!isPcWechat() && navigateToMiniProgramHumanKefu()) return;
    if (wecomKefuChatUrl && isMobileWechat()) {
      window.location.href = wecomKefuChatUrl;
      return;
    }
    if (wecomKefuChatUrl) {
      // window.open 可能被拦截/返回 null（部分 webview 不支持新开窗口）：
      // 失败兜底为当前页跳转 location.href，确保人工客服一定能进。
      const opened = window.open(wecomKefuChatUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        window.location.href = wecomKefuChatUrl;
        return;
      }
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

  // 辅助购买待支付卡「去支付」：跳小程序内顾客已登录的代拍待支付页完成付款（mirror openOrderDetail）。
  // 跳不动（path 未配置 / 非小程序 webview）→ 兜底提示回小程序，绝不在客服 H5 直接发起 JWT 收款。
  function openProxyBuyPay(ref: ProxyBuyPay) {
    if (!ref.orderRef) return;
    if (navigateToMiniProgramProxyBuyPay(ref.orderRef)) return;

    setHumanTransferVisible(true);
    setHumanTransferNote(
      "请在袋鼠君小程序内打开本页面，再点击待支付订单完成支付。",
    );
  }

  // 列表卡点某条 item：detail_target 决定跳订单详情还是物流轨迹。
  //   - 'express' → 小程序物流轨迹页（已出仓）
  //   - 'order'（或缺省）→ 小程序订单详情页（默认，与已购未到仓一致）
  // PC / 非 webview 跳不动 → 复用现有兜底提示「请在小程序内查看」。
  function openListItem(item: ListItem) {
    if (!item.order_id) return;
    const navigated =
      item.detail_target === "express"
        ? navigateToMiniProgramExpress(item.order_id)
        : navigateToMiniProgramOrderDetail(item.order_id);
    if (navigated) return;

    setHumanTransferVisible(true);
    setHumanTransferNote(
      "请在袋鼠君小程序内打开本页面，再点击订单查看详情或物流。",
    );
  }

  // 列表卡翻页：拼出与 bridge 翻页解析对齐的基础按钮文本 + 「第N页」。
  // bridge 正则 `第\s*(\d+)\s*页?` 取页码、剥后缀后匹配基础文本定 stage：
  //   - warehouse → 「查到日本仓进度 第N页」
  //   - shipped   → 「查国际物流(出仓后) 第N页」
  function goListPage(listRef: ListRef, direction: -1 | 1) {
    const current = listRef.page ?? 1;
    const target = current + direction;
    if (target < 1) return;
    const base =
      listRef.stage === "shipped" ? "查国际物流(出仓后)" : "查到日本仓进度";
    void sendMessage(`${base} 第${target}页`);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formMessage = formData.get("message");
    void sendMessage(typeof formMessage === "string" ? formMessage : draft);
  }

  // 报价卡"咨询"。
  //   - 辅助购买平台（rakuma/yahoofrima）：bridge 报价时已暂存商品态，点[咨询]直接
  //     sendMessage("咨询商品") → bridge 咨询 ask 分支**主动回**「请问您想了解这个商品
  //     的什么?(成色/价格/包邮/物流时效/代购规则/费用都可以问)」，不再塞输入框等买家发。
  //   - mercari / 雅虎：保持原行为（仅预填输入框并聚焦，买家自己补充后再发），零回归
  //     ——这两类报价卡来自 _mercari_quote/_yahoo_quote，bridge 无咨询暂存态，发"咨询商品"
  //     只会被回「重发链接」，故不改。
  function consultQuote(quote?: QuoteRef) {
    if (quote?.platform && ASSISTED_PURCHASE_PLATFORMS.has(quote.platform)) {
      // 开启追问窗口期：接下来 10 分钟内的消息都放行 BFF 闸门，直达 bridge 的
      // _consult_pending 会话态承接（见 consultActiveUntilRef 声明处注释）。
      consultActiveUntilRef.current = Date.now() + 10 * 60 * 1000;
      void sendMessage(ASSISTED_CONSULT_TEXT + buildAssistedQuoteMarker(quote));
      return;
    }
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

  // 汇总某张报价卡上买家已勾选**且有数字 id** 的可选服务 id，逗号拼成机读串（如 "5,6"）。
  // 契约字段 selected_value_added_ids：随[我要购买]购买意图发给 bridge，bridge 暂存→确认时
  // 透传给现代后端 createOrderForAgent 的 value_added（老后台 st_value_added 主键，权威收费）。
  // 与 collectSelectedServiceCodes（给网页结算页 URL 的 code 串）区分：这里是给 bridge 的 id 串。
  // 勾选状态/key 沿用 quoteServiceSelections（同渲染/合计的 svc.code||label||svc-i 口径）。
  // 无勾选或勾选项均无 id 时返回 ""（空串则上层不传该字段）。
  function collectSelectedServiceIds(cardKey: string, quote: QuoteRef): string {
    const services = quote.optional_services;
    if (!services || services.length === 0) return "";
    const checkedMap = quoteServiceSelections[cardKey] || {};
    const ids: string[] = [];
    for (let i = 0; i < services.length; i += 1) {
      const svc = services[i];
      const code = svc.code || svc.label || `svc-${i}`;
      if (!checkedMap[code] || svc.id === undefined) continue;
      ids.push(String(svc.id));
    }
    return ids.join(",");
  }

  // 报价卡「预估合计」（日元整数）：现价 + 支付手续费 + 代拍手续费 + Σ(已勾选可选服务费)。
  // 仅前端展示用，随买家勾选实时重算（依赖 quoteServiceSelections 触发 re-render），
  // 让买家看见勾选增值服务后的价格变化、避免价格歧义。国内运费按现状不计入（仅 note 说明）。
  // 权威金额仍以建单时服务端按勾选项重算为准，本函数不改建单逻辑。JPY 整数，不除以 100。
  // price_jpy 缺省时返回 undefined（不渲染合计行，避免显示无意义的纯手续费总额）。
  function computeQuoteTotalJpy(
    cardKey: string,
    quote: QuoteRef,
  ): number | undefined {
    if (quote.price_jpy === undefined) return undefined;
    let total = quote.price_jpy + (quote.fee_service_jpy ?? 0) + (quote.fee_agent_jpy ?? 0);
    const services = quote.optional_services;
    if (services && services.length > 0) {
      const checkedMap = quoteServiceSelections[cardKey] || {};
      for (let i = 0; i < services.length; i += 1) {
        const svc = services[i];
        const code = svc.code || svc.label || `svc-${i}`;
        if (checkedMap[code] && svc.fee_jpy !== undefined) {
          total += svc.fee_jpy;
        }
      }
    }
    return total;
  }

  // 报价卡「我要购买」：mercari 直接进**现成的**购买/待支付流程（不再发转人工套话）。
  //   - 小程序 webview 内 → 跳袋鼠君小程序 mercari 商品页（含「立即购买」，自带登录守卫/购买提示）；
  //   - 普通网页 H5 → router.push 现成网页结算页 /{lang}/checkout?type=mercari&id=...
  //     （与 mercari 商品页「立即购买」同一入口：createOrder → NewAge 付款 → 待支付）。
  // 买家勾选的可选服务 code 与已确认风险标记尽量作为 URL query 透传（services=逗号分隔code、risk_ack=1），
  // 结算/小程序端将来读取（后端建单存费由中枢另做，前端先透传，读不读不影响本次路由）。
  // 雅虎(platform==='yahoo')：NestJS 新后端已退役，一口价/竞拍都不进网页结算页——
  // 竞拍（sale_type!=='sokketsu'）保持原 sendMessage 行为不动；一口价（sale_type
  // ==='sokketsu'）改跳小程序雅虎详情页在老后台下单（方案①，2026-08-24）。
  function buyQuote(cardKey: string, quote: QuoteRef) {
    if (quote.platform === "yahoo" && quote.sale_type !== "sokketsu") {
      let intent = "我要购买此商品";
      intent += summarizeSelectedServices(cardKey, quote);
      if (quote.seller_risk?.needs_confirm && quoteRiskConfirmed[cardKey]) {
        intent += "；我已了解高额订单风险（不退不换），请继续为我录入";
      }
      void sendMessage(intent);
      return;
    }

    // 辅助购买平台（rakuma / yahoofrima）：走 bridge 辅助建单流，**不**跳现成网页结算页。
    // 报价时 bridge 已 _stash_consult_pending 暂存 platform+goodsNo；点[我要购买]回发
    // 前缀「我要购买此商品」→ bridge is_quote_card_buy → _handle_purchase_intent →
    // 报价确认 → 「确认」后 internal/orders 建 st_orders → 返 order_ref 待支付卡。
    // 之前误落到下方 mercari 分支跳 /checkout?type=mercari&id=<rakuma/yahoofrima_id>，
    // 网页结算页按 mercari 拉商品 → 「商品不存在」→ 白屏（花哥实测 yahoofrima 点购买白屏）。
    if (quote.platform && ASSISTED_PURCHASE_PLATFORMS.has(quote.platform)) {
      // 小程序 webview 内（三等分 咨询/加购/支付 场景）：「支付」直接跳小程序现成的
      // sites/confirm 确认订单页（花哥 2026-08-14 拍板：与 mercari 确认单页同构，
      // 商品卡+费用明细+提交订单，不再跳购物车、不走 chat 文字录单流）。
      // 有商品号跳确认单页；缺商品号退回购物车统一结算；两者都跳不动才走下方文字流。
      // 非 webview 的浏览器 H5 没有小程序页面可跳，仍走 bridge 辅助建单文字流。
      if (isMiniProgramWebview()) {
        // 已勾选的增值服务须随「支付」跳转一起带到确认页，否则服务漏收（真机 bug）。
        const sitesValueAddedIds = collectSelectedServiceIds(cardKey, quote);
        if (
          quote.item_id &&
          navigateToMiniProgramSitesConfirm(
            quote.platform,
            quote.item_id,
            sitesValueAddedIds,
          )
        )
          return;
        if (navigateToMiniProgramCart()) return;
      }
      let intent = ASSISTED_BUY_INTENT_TEXT;
      intent += summarizeSelectedServices(cardKey, quote);
      if (quote.seller_risk?.needs_confirm && quoteRiskConfirmed[cardKey]) {
        intent += "；我已了解高额订单风险（不退不换），请继续为我录入";
      }
      // 商品标记须在最末尾（bridge 按后缀解析，见 buildAssistedQuoteMarker 注释）。
      intent += buildAssistedQuoteMarker(quote);
      // 把买家勾选的增值服务**数字 id 串**随购买意图发给 bridge（契约字段
      // selected_value_added_ids，逗号数字串如 "5,6"）。bridge 暂存→确认时透传给
      // 现代后端 value_added 建单收费。空串则不带该字段（向后兼容，不勾选零影响）。
      const valueAddedIds = collectSelectedServiceIds(cardKey, quote);
      void sendMessage(
        intent,
        valueAddedIds ? { selected_value_added_ids: valueAddedIds } : undefined,
      );
      return;
    }

    // 以下仅 mercari：进现成购买流程。非 mercari 且不在 ASSISTED_PURCHASE_PLATFORMS 白名单内的
    // 平台（2026-08-23 真机反馈）此前会静默落入这条 mercari 专属流程，拿别平台商品号去建
    // mercari 订单 → 结算页/小程序页「商品不存在」白屏；改成提前拦截 + 转人工提示，不再
    // 静默假装是 mercari（呼应上面 yahoofrima/cardrush-main 那两次同款白屏教训）。
    if (
      quote.platform &&
      quote.platform !== "mercari" &&
      quote.platform !== "yahoo"
    ) {
      setHumanTransferVisible(true);
      setHumanTransferNote("暂不支持该平台的自动购买，请联系客服协助下单。");
      return;
    }
    const itemId = quote.item_id;
    // 没有商品号无法定位购买流程：兜底回原 sendMessage 行为，避免跳到空 id 的结算页。
    if (!itemId) {
      void sendMessage("我要购买此商品" + summarizeSelectedServices(cardKey, quote));
      return;
    }

    // 雅虎一口价：NestJS 新后端已退役，不再走网页结算页——改跳小程序雅虎详情页在老后台
    // 下单（与 goYahooBid「去出价」同一目标页，一口价购买按钮由老后台按 sale_type 渲染）。
    // 跳不动（非小程序 webview / PC 微信）回退人工提示，不落到已删除的结算页。
    if (quote.platform === "yahoo") {
      if (navigateToMiniProgramYahooBid(itemId, isCandyTheme)) return;
      setHumanTransferVisible(true);
      setHumanTransferNote(
        "雅虎一口价购买请在袋鼠君小程序内操作（打开该商品详情页）。",
      );
      return;
    }

    // 买家选择透传：服务 code 列表 + 风险已确认标记。
    const serviceCodes = collectSelectedServiceCodes(cardKey, quote);
    const riskAck = Boolean(
      quote.seller_risk?.needs_confirm && quoteRiskConfirmed[cardKey],
    );

    // 小程序 webview：直接跳小程序内 confirm 结算页（仅 mercari，走到这里已排除 yahoo）。
    if (isMiniProgramWebview()) {
      const valueAddedIds = collectSelectedServiceIds(cardKey, quote);
      if (navigateToMiniProgramBuy(itemId, valueAddedIds)) return;
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

  // 报价卡「加入购物车」：跳小程序该商品详情页，由详情页按钮完成加购。
  // 仅在 renderQuoteCard 判定 canAddToCart 为真（webview 内 + 平台/商品号齐全）
  // 时才会渲染出该按钮，故这里跳不动理论上不该发生；仍不静默吞掉失败，兜底转人工。
  function addQuoteToCart(quote: QuoteRef) {
    const itemId = quote.item_id;
    const platform = quote.platform;
    if (
      itemId &&
      platform &&
      (platform === "mercari" || ASSISTED_PURCHASE_PLATFORMS.has(platform)) &&
      navigateToMiniProgramGoodsDetail(platform, itemId)
    ) {
      return;
    }
    setHumanTransferVisible(true);
    setHumanTransferNote("请在袋鼠君小程序内打开该商品详情页加入购物车。");
  }

  // 报价卡「点封面图/标题」跳小程序商品详情页（所有平台，2026-08-23 新增）。
  // 雅虎单独分流去竞拍出价页（雅虎商品在小程序内没有独立详情页，出价页即详情）；
  // 煤炉竞拍卡（kind==='auction'）也单独分流：竞拍品跳小程序详情页会被老后台判成
  // 「已售出」，改为展开页面里已有的「确认出价」最终确认面板（复用 openMercariBidConfirm，
  // 与「确认竞拍」按钮同一入口）。其它平台/非竞拍复用 navigateToMiniProgramGoodsDetail
  // （与「加入购物车」同一跳转）。
  // QuoteRef 目前没有源站 url 字段，跳不动（非小程序 webview）时只能兜底转人工，
  // 不做 window.open——保留该分支注释以便后端后续下发源站链接时补上。
  function openQuoteDetail(quote: QuoteRef) {
    const itemId = quote.item_id;
    const platform = quote.platform;
    if (quote.kind === "auction") {
      openMercariBidConfirm(quote);
      return;
    }
    if (platform === "yahoo") {
      if (itemId && navigateToMiniProgramYahooBid(itemId, isCandyTheme)) return;
    } else if (platform && itemId) {
      if (navigateToMiniProgramGoodsDetail(platform, itemId)) return;
    }
    setHumanTransferVisible(true);
    setHumanTransferNote("请在袋鼠君小程序内打开该商品详情页。");
  }

  // 竞拍（雅虎/煤炉）「去充押金」：仅跳转小程序充值页，不触发任何金钱动作。
  // path 未配置（占位）时按钮本就禁用，这里再兜底：跳不动就引导回小程序。
  function goRechargeDeposit(moneyRmb?: number) {
    if (navigateToMiniProgramDepositRecharge(moneyRmb)) return;
    setHumanTransferVisible(true);
    setHumanTransferNote(
      "请在袋鼠君小程序内打开『我的-我的押金』充值押金后再参与竞拍。",
    );
  }

  // 「我的竞拍」快捷入口：跳雅虎竞拍出价记录页，参数拼法与 goYahooBid 一致。
  // 仅登录态（userId 纯数字 + 有签名）展示，游客没有签名身份不显示。
  function goMyAuctions() {
    const qs = new URLSearchParams();
    qs.set("user_id", userId!);
    if (uidSignature.ts) qs.set("ts", uidSignature.ts);
    qs.set("sig", uidSignature.sig!);
    if (isCandyTheme) qs.set("theme", "candy");
    router.push(`/${lang}/support/auction/mine?${qs.toString()}`);
  }

  // 雅虎竞拍「去出价」：H5 内闭环跳详情/出价页（不再跳小程序 yahoo_detail）。
  // 游客（user_id 非纯数字）没有签名身份，出价接口验不过签名，直接提示回登录态。
  function goYahooBid(itemId?: string, goodsNameZh?: string) {
    if (!itemId) return;
    if (!userId) {
      setHumanTransferVisible(true);
      setHumanTransferNote("请先登录小程序后再参与竞拍出价。");
      return;
    }
    const qs = new URLSearchParams();
    qs.set("user_id", userId);
    if (uidSignature.ts) qs.set("ts", uidSignature.ts);
    if (uidSignature.sig) qs.set("sig", uidSignature.sig);
    if (isCandyTheme) qs.set("theme", "candy");
    if (goodsNameZh) qs.set("zh", goodsNameZh);
    router.push(`/${lang}/support/auction/${encodeURIComponent(itemId)}?${qs.toString()}`);
  }

  // 煤炉竞拍「确认竞拍」：点按钮不再直接发消息，先展开最终确认面板（记录 item_id），
  // 默认出价 = default_bid_jpy ?? current_bid，已展开过的沿用买家已输入的值。
  function openMercariBidConfirm(quote: QuoteRef) {
    const itemId = quote.item_id;
    if (!itemId) return;
    setMercariBidConfirmingItemId(itemId);
    setMercariBidAmountInputs((prev) =>
      prev[itemId] !== undefined
        ? prev
        : {
            ...prev,
            [itemId]: String(quote.default_bid_jpy ?? quote.current_bid ?? 0),
          },
    );
  }

  function closeMercariBidConfirm() {
    setMercariBidConfirmingItemId(null);
  }

  // 面板内点「确认出价」：把买家确认过的金额拼成消息发送（与用户手输走同一条
  // sendMessage 路径），bridge 据此推进竞拍确认/出价；发送后收起面板。
  function confirmMercariAuctionBid(amountJpy: number) {
    void sendMessage(`确认竞拍 ¥${amountJpy.toLocaleString("en-US")}`);
    setMercariBidConfirmingItemId(null);
  }

  // 「留言给卖家」（砍价/咨询）：仅 mercari 报价卡展示，visitor 接口公开、不依赖小程序
  // 登录态，webview 和浏览器直开都可用（与 canAddToCart 的 wxReady 门槛无关）。
  // opts 供 leaveMsgRef 结构化卡片调用：可带 floorPriceJpy/link 上下文，并直接跳过
  // 类型选择屏、带预填砍价打开对应子视图（原报价卡按钮不传 opts，行为不变）。
  function openLeaveMsgModal(
    cardKey: string,
    quote: QuoteRef,
    opts?: {
      floorPriceJpy?: number;
      link?: string;
      initialType?: "bargain" | "question";
      prefillAmountJpy?: number;
    },
  ) {
    setLeaveMsgTarget({
      cardKey,
      quote,
      floorPriceJpy: opts?.floorPriceJpy,
      link: opts?.link,
    });
    setLeaveMsgType(opts?.initialType ?? null);
    setLeaveMsgTargetPrice(
      opts?.prefillAmountJpy !== undefined
        ? String(opts.prefillAmountJpy)
        : "",
    );
    setLeaveMsgQuestionText("");
    setLeaveMsgError("");
  }

  function closeLeaveMsgModal() {
    setLeaveMsgTarget(null);
    setLeaveMsgType(null);
    setLeaveMsgTargetPrice("");
    setLeaveMsgQuestionText("");
    setLeaveMsgError("");
    setLeaveMsgSubmitting(false);
  }

  // 砍价下限：现价的 80%（向上取整），低于此价前端直接硬拦不提交，与后端校验对齐。
  function leaveMsgBargainFloor(priceJpy?: number) {
    return priceJpy !== undefined ? Math.ceil(priceJpy * 0.8) : undefined;
  }

  async function submitLeaveMsg() {
    if (!leaveMsgTarget || !leaveMsgType || leaveMsgSubmitting) return;
    const { quote } = leaveMsgTarget;
    const goodsNo = quote.item_id;
    if (!goodsNo || !userId) {
      setLeaveMsgError("身份信息缺失，请从袋鼠君小程序重新进入～");
      return;
    }

    const body: Record<string, unknown> = {
      action: "leave-message",
      user_id: userId,
      ts: uidSignature.ts,
      sig: uidSignature.sig,
      platform: "mercari",
      goods_no: goodsNo,
      type: leaveMsgType,
    };

    if (leaveMsgType === "bargain") {
      const target = Number(leaveMsgTargetPrice);
      if (
        !leaveMsgTargetPrice.trim() ||
        !Number.isInteger(target) ||
        target <= 0
      ) {
        setLeaveMsgError("请输入整数日元目标价");
        return;
      }
      const floor =
        leaveMsgTarget.floorPriceJpy ?? leaveMsgBargainFloor(quote.price_jpy);
      if (floor !== undefined && target < floor) {
        setLeaveMsgError(
          `目标价不能低于现价的 80%，最低可请求 ¥${floor.toLocaleString("ja-JP")} 日元`,
        );
        return;
      }
      body.targetPriceJpy = target;
      if (quote.price_jpy !== undefined) body.listingPriceJpy = quote.price_jpy;
    } else {
      const text = leaveMsgQuestionText.trim();
      if (!text) {
        setLeaveMsgError("请填写想咨询卖家的问题");
        return;
      }
      body.customerRequestZh = text;
    }

    setLeaveMsgSubmitting(true);
    setLeaveMsgError("");
    try {
      const res = await fetch("/api/support/seller-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload: unknown = await res.json().catch(() => null);
      const payloadRecord =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)
          : null;
      if (!res.ok || !payloadRecord || payloadRecord.code !== 0) {
        // 后端/中继失败原因原样展示给买家（如"该商品留言已达2次上限"），不静默、不用通用话术兜底。
        const errmsg =
          payloadRecord && typeof payloadRecord.errmsg === "string"
            ? payloadRecord.errmsg
            : "留言提交失败了，请稍后重试～";
        setLeaveMsgError(errmsg);
        return;
      }
      // 200+code:0 不等于真提交成功：规则引擎（如砍价 2 次上限）会同步判拒，此时
      // data.customer_status==='rejected'，要照实拦下，不能当成功 toast 糊弄过去。
      const data =
        payloadRecord.data && typeof payloadRecord.data === "object"
          ? (payloadRecord.data as Record<string, unknown>)
          : null;
      if (data && data.customer_status === "rejected") {
        const rejectReason =
          typeof data.reject_reason_zh === "string" && data.reject_reason_zh
            ? data.reject_reason_zh
            : "留言未通过平台规则，未提交";
        setLeaveMsgError(rejectReason);
        return;
      }
      toast.success("已提交，人工确认后会转达卖家，可在留言中心查看进度");
      closeLeaveMsgModal();
    } catch {
      setLeaveMsgError("网络异常，请稍后重试～");
    } finally {
      setLeaveMsgSubmitting(false);
    }
  }

  // 煤炉竞拍 deposit_state='no_account'「点我注册」：跳 register_url（同域 jp-buy.com）。
  // 小程序 webview 内用 location.href 跳（避免 wx.miniProgram.navigateTo 只能跳小程序内页、
  // 跳不了外链 h5）；非微信环境用 window.open 新开页，不弹复制框兜底。
  function openMercariAuctionRegister(url?: string) {
    if (!url) return;
    if (isMiniProgramWebview()) {
      window.location.href = url;
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // 单张报价卡渲染（从 renderChatItem 抽出，供单件 quoteRef 与批量 quoteRefs 共用）。
  // cardKey 是该卡在 quoteServiceSelections/quoteRiskConfirmed 等按卡状态 map 里的主键：
  // 单件时沿用消息 key（与改造前行为一致，零回归）；批量时用 `${messageKey}-quote-${idx}`，
  // 保证同一条回复里多张卡的勾选/风险确认互不串。
  const renderQuoteCard = (quote: QuoteRef, cardKey: string) => {
    // 雅虎分流：platform==='yahoo' 且 sale_type 决定模板。非雅虎（mercari 等）一律走老逻辑。
    const isYahoo = quote.platform === "yahoo";
    const isYahooAuction = isYahoo && quote.sale_type === "auction";
    const isYahooSokketsu = isYahoo && quote.sale_type === "sokketsu";
    // 煤炉竞拍卡（新增）：与雅虎竞拍共用「当前价/剩余时间/出价数」信息区样式，押金区/操作
    // 按钮走各自平台的分支（煤炉走 sendMessage 确认竞拍，不经小程序出价页）。
    const isMercariAuction =
      quote.platform === "mercari" && quote.sale_type === "auction";
    // 「去充押金」入口是否可用：仅当配置了充值页 path 才可点。
    const depositRechargeEnabled = Boolean(YAHOO_DEPOSIT_RECHARGE_PAGE_PATH);
    // 封面图/标题可点跳详情：platform + item_id 都齐才可点（openQuoteDetail 内部也会兜底）。
    const canOpenDetail = Boolean(quote.platform && quote.item_id);

    return (
      <div
        key={cardKey}
        className="mt-2 w-[82%] max-w-sm rounded-lg border border-orange-100 bg-white p-3 shadow-sm"
        data-testid="support-quote-card"
      >
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Tag className="h-4 w-4 text-orange-500" />
          报价确认
        </div>
        {quote.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={quote.cover}
            alt={quote.goods_name_zh || quote.goods_name || "商品图片"}
            className={`mb-2 h-32 w-full rounded-md object-cover${canOpenDetail ? " cursor-pointer" : ""}`}
            loading="lazy"
            role={canOpenDetail ? "button" : undefined}
            onClick={canOpenDetail ? () => openQuoteDetail(quote) : undefined}
          />
        ) : null}
        {quote.goods_name || quote.goods_name_zh ? (
          <div
            className={`line-clamp-2 text-sm leading-5 text-slate-700${canOpenDetail ? " cursor-pointer" : ""}`}
            role={canOpenDetail ? "button" : undefined}
            onClick={canOpenDetail ? () => openQuoteDetail(quote) : undefined}
          >
            {quote.goods_name_zh || quote.goods_name}
          </div>
        ) : null}
        {quote.goods_name_zh && quote.goods_name ? (
          <div className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-slate-400">
            {quote.goods_name}
          </div>
        ) : null}
        {quote.price_jpy !== undefined ? (
          <div className="mt-2 text-sm font-medium text-slate-900">
            现价 ¥{quote.price_jpy.toLocaleString("ja-JP")} 日元
          </div>
        ) : null}
        {quote.fee_service_jpy !== undefined ? (
          <div className="mt-1 text-xs leading-5 text-slate-500">
            支付手续费：¥
            {quote.fee_service_jpy.toLocaleString("ja-JP")} 日元
          </div>
        ) : null}
        {quote.fee_agent_jpy !== undefined ? (
          <div className="mt-1 text-xs leading-5 text-slate-500">
            代拍手续费：¥
            {quote.fee_agent_jpy.toLocaleString("ja-JP")} 日元
          </div>
        ) : null}
        {quote.domestic_shipping_note ? (
          <div className="mt-1 text-xs leading-5 text-slate-500">
            {quote.domestic_shipping_note}
          </div>
        ) : null}
        {quote.est_goods_rmb ? (
          <div className="mt-2 text-sm font-medium text-slate-900">
            约 ¥{quote.est_goods_rmb}
            <span className="font-normal text-slate-500">
              （不含运费）
            </span>
          </div>
        ) : null}
        {quote.rate_note ? (
          <p className="mt-1 text-[11px] leading-4 text-slate-400">
            {quote.rate_note}
          </p>
        ) : null}

        {/* ── 可选增值服务区（仅录单流：mercari / 雅虎即決；雅虎竞拍/煤炉竞拍走出价不展示）。
             买家勾选只前端记录，实际计费在录单环节由 L1/L2/客服处理。 */}
        {!isYahooAuction &&
        !isMercariAuction &&
        quote.optional_services &&
        quote.optional_services.length > 0 ? (
          <div
            className="mt-3 rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2"
            data-testid="support-quote-optional-services"
          >
            <div className="mb-1.5 text-xs font-medium text-slate-700">
              可选增值服务（勾选后由客服为您核对计费，现在不扣费）
            </div>
            <div className="space-y-1.5">
              {quote.optional_services.map((svc, svcIndex) => {
                const svcCode = svc.code || svc.label || `svc-${svcIndex}`;
                const checked = Boolean(
                  quoteServiceSelections[cardKey]?.[svcCode],
                );
                return (
                  <div key={svcCode}>
                    <label className="flex items-start gap-2 text-xs leading-5 text-slate-700">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-orange-500"
                        checked={checked}
                        disabled={Boolean(svc.disabled)}
                        onChange={() => toggleQuoteService(cardKey, svcCode)}
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

        {/* ── 预估合计（日元整数）：现价+支付手续费+代拍手续费+已勾选可选服务费。
             随买家勾选实时重算（computeQuoteTotalJpy 依赖 quoteServiceSelections re-render），
             让买家看见勾选增值服务后的价格变化、避免价格歧义。竞拍卡不出（走出价/押金）。
             仅前端展示，权威金额仍以建单时服务端按勾选项重算为准。 */}
        {!isYahooAuction && !isMercariAuction && quote.price_jpy !== undefined ? (
          <div
            className="mt-3 border-t border-slate-100 pt-2"
            data-testid="support-quote-total"
          >
            <div className="flex items-baseline justify-between gap-2 text-sm font-semibold text-slate-900">
              <span>预估合计</span>
              <span data-testid="support-quote-total-jpy">
                ¥
                {(
                  computeQuoteTotalJpy(cardKey, quote) ?? 0
                ).toLocaleString("ja-JP")}{" "}
                日元
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-4 text-slate-400">
              合计为估算（不含国内运费），最终以客服核对或小程序下单当日为准。
            </p>
          </div>
        ) : null}

        {/* ── >5万风险确认卡（卖家核验不达标时显著展示）。
             仅录单流出卡；买家点确认只前端记录，不录入/不付款/不下单。 */}
        {!isYahooAuction && !isMercariAuction && quote.seller_risk?.needs_confirm ? (
          <div
            className="mt-3 rounded-md border border-red-300 bg-red-50 px-2.5 py-2"
            data-testid="support-quote-risk-card"
          >
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-red-700">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              高额订单风险确认
            </div>
            {(() => {
              const risk = quote.seller_risk!;
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
              {quote.seller_risk.disclaimer ||
                "请确认：一旦平台购买成功，通常不支持因卖家描述、成色差异、个人判断变化等原因退换。若平台或卖家拒绝交易，我们按平台结果处理。"}
            </p>
            {quoteRiskConfirmed[cardKey] ? (
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
                onClick={() => confirmQuoteRisk(cardKey)}
                data-testid="support-quote-risk-confirm-btn"
              >
                我已了解风险，继续录入订单
              </button>
            )}
            {!quoteRiskConfirmed[cardKey] ? (
              <p className="mt-1.5 text-[11px] leading-4 text-red-400">
                确认前不会录入订单、不会付款、不会自动下单。
              </p>
            ) : null}
          </div>
        ) : null}

        {/* 雅虎/煤炉竞拍：现价/一口价/剩余时间/出价数（缺字段不显示对应行） */}
        {isYahooAuction || isMercariAuction ? (
          <div
            className="mt-2 space-y-1 rounded-md bg-slate-50 px-2.5 py-2 text-xs leading-5 text-slate-600"
            data-testid="support-quote-auction-info"
          >
            {quote.current_bid !== undefined ? (
              <div className="text-sm font-medium text-slate-900">
                当前出价 ¥
                {quote.current_bid.toLocaleString("ja-JP")} 日元
              </div>
            ) : null}
            {quote.buyout_jpy !== undefined &&
            quote.buyout_jpy > 0 ? (
              <div>
                一口价 ¥
                {quote.buyout_jpy.toLocaleString("ja-JP")} 日元
              </div>
            ) : null}
            {quote.left_time ? (
              <div>剩余时间：{quote.left_time}</div>
            ) : null}
            {quote.bid_num !== undefined ? (
              <div>出价数：{quote.bid_num}</div>
            ) : null}
          </div>
        ) : null}

        {isYahooAuction && quote.purchasable !== false ? (
          // 竞拍卡：押金区，不放「立即出价/我要购买/确认录入」（出价走小程序竞拍流程）
          <div className="mt-3" data-testid="support-quote-auction-deposit">
            {quote.deposit_state === "ok" ? (
              <div
                className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs leading-5 text-emerald-700"
                data-testid="support-quote-deposit-ok"
              >
                押金余额
                {quote.deposit_balance_rmb !== undefined
                  ? `≈¥${quote.deposit_balance_rmb.toLocaleString(
                      "zh-CN",
                    )}`
                  : ""}
                ，本商品可出价上限
                {quote.max_bid_allowed_jpy !== undefined
                  ? `≈¥${quote.max_bid_allowed_jpy.toLocaleString(
                      "ja-JP",
                    )}（日元）`
                  : "请回小程序查看"}
                。
              </div>
            ) : quote.deposit_state === "insufficient" ? (
              <div
                className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs leading-5 text-amber-800"
                data-testid="support-quote-deposit-insufficient"
              >
                您暂无足够押金，建议充值
                {quote.suggest_recharge_rmb !== undefined
                  ? `≈¥${quote.suggest_recharge_rmb.toLocaleString(
                      "zh-CN",
                    )}`
                  : ""}
                后参与竞拍。
                <button
                  type="button"
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:bg-amber-200"
                  onClick={() => goRechargeDeposit(quote.suggest_recharge_rmb)}
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
            {/* 竞拍卡动作：咨询(雅虎竞拍仍预填输入框) + 去出价(跳小程序竞拍详情页,出价/押金小程序专属) */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="flex items-center justify-center gap-1 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-orange-700 shadow-sm disabled:opacity-50"
                onClick={() => consultQuote(quote)}
                disabled={loading}
                data-testid="support-quote-auction-btn-consult"
              >
                <MessageCircle className="h-4 w-4" />
                咨询
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-1 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:bg-orange-200"
                onClick={() => goYahooBid(quote.item_id, quote.goods_name_zh)}
                disabled={loading}
                data-testid="support-quote-auction-btn-bid"
              >
                <ShoppingBag className="h-4 w-4" />
                去出价
              </button>
            </div>
          </div>
        ) : isMercariAuction ? (
          // 煤炉竞拍卡：押金区按 deposit_state 分支（ok/insufficient/no_account/unavailable）；
          // 「确认竞拍」直接把 action_text 当消息发送（sendMessage，与手输同路径），不经小程序出价页。
          <div className="mt-3" data-testid="support-quote-mercari-auction-deposit">
            {quote.deposit_state === "ok" ? (
              <div
                className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs leading-5 text-emerald-700"
                data-testid="support-quote-deposit-ok"
              >
                可用押金
                {quote.deposit_balance_rmb !== undefined
                  ? `≈¥${quote.deposit_balance_rmb.toLocaleString(
                      "zh-CN",
                    )}`
                  : ""}
                ，本商品可出价上限
                {quote.max_bid_allowed_jpy !== undefined
                  ? `≈¥${quote.max_bid_allowed_jpy.toLocaleString(
                      "ja-JP",
                    )}（日元）`
                  : "请回小程序查看"}
                。
              </div>
            ) : quote.deposit_state === "insufficient" ? (
              <div
                className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs leading-5 text-amber-800"
                data-testid="support-quote-deposit-insufficient"
              >
                您暂无足够押金，建议充值
                {quote.suggest_recharge_rmb !== undefined
                  ? `≈¥${quote.suggest_recharge_rmb.toLocaleString(
                      "zh-CN",
                    )}`
                  : ""}
                后参与竞拍。
                <button
                  type="button"
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:bg-amber-200"
                  onClick={() => goRechargeDeposit(quote.suggest_recharge_rmb)}
                  disabled={!depositRechargeEnabled}
                  data-testid="support-quote-btn-recharge"
                >
                  {depositRechargeEnabled ? "去充押金" : "充值入口待配置"}
                </button>
              </div>
            ) : quote.deposit_state === "no_account" ? (
              <div
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs leading-5 text-slate-600"
                data-testid="support-quote-deposit-no-account"
              >
                未查到您的竞拍押金账户，需先注册开通后才能参与竞拍。
                <button
                  type="button"
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:bg-orange-200"
                  onClick={() => openMercariAuctionRegister(quote.register_url)}
                  disabled={!quote.register_url}
                  data-testid="support-quote-btn-register"
                >
                  点我注册
                </button>
              </div>
            ) : quote.deposit_state === "unavailable" ? (
              <div
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs leading-5 text-slate-500"
                data-testid="support-quote-deposit-unavailable"
              >
                押金查询暂不可用，请联系客服。
              </div>
            ) : (
              <div
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs leading-5 text-slate-500"
                data-testid="support-quote-deposit-unknown"
              >
                登录后可查看你的押金额度。
              </div>
            )}
            {/* 确认竞拍：ok 时点按钮展开最终确认面板（改金额/取消）；insufficient 时同样
                展示按钮但 disabled（先充押金）。面板收起前不发任何消息。 */}
            {quote.deposit_state === "ok" ||
            quote.deposit_state === "insufficient" ? (
              (() => {
                const itemId = quote.item_id;
                const isConfirming =
                  Boolean(itemId) && mercariBidConfirmingItemId === itemId;
                if (!isConfirming) {
                  return (
                    <button
                      type="button"
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:bg-orange-200"
                      onClick={() => openMercariBidConfirm(quote)}
                      disabled={
                        loading || quote.deposit_state !== "ok" || !itemId
                      }
                      data-testid="support-quote-auction-btn-confirm"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      {quote.action_text || "确认竞拍"}
                    </button>
                  );
                }
                const currentBid = quote.current_bid ?? 0;
                const minBid = currentBid + 100;
                const maxAllowed = quote.max_bid_allowed_jpy;
                const bidAmountStr =
                  mercariBidAmountInputs[itemId as string] ??
                  String(quote.default_bid_jpy ?? currentBid);
                const bidAmount = Number(bidAmountStr || 0);
                const belowMin = bidAmount < minBid;
                const overMax =
                  maxAllowed !== undefined && bidAmount > maxAllowed;
                return (
                  <div
                    className="mt-2 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-2"
                    data-testid="support-quote-mercari-auction-bid-panel"
                  >
                    <label className="block text-xs font-medium text-slate-700">
                      我的最高出价（日元）
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      step={100}
                      min={minBid}
                      value={bidAmountStr}
                      onChange={(e) => {
                        setMercariBidAmountInputs((prev) => ({
                          ...prev,
                          [itemId as string]: e.target.value.replace(
                            /[^\d]/g,
                            "",
                          ),
                        }));
                      }}
                      className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900"
                      data-testid="support-quote-mercari-auction-bid-input"
                    />
                    {belowMin ? (
                      <p className="mt-1 text-[11px] leading-4 text-red-500">
                        需高于当前价 ¥{currentBid.toLocaleString("ja-JP")}
                      </p>
                    ) : null}
                    {overMax ? (
                      <p className="mt-1 text-[11px] leading-4 text-red-500">
                        超出可用押金额度 ¥
                        {(maxAllowed as number).toLocaleString("ja-JP")}
                        ，请先充押金
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-[11px] leading-4 text-slate-500">
                      系统将代您出价，最高不超过此金额；确认后不可撤回。
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm"
                        onClick={closeMercariBidConfirm}
                        data-testid="support-quote-mercari-auction-btn-bid-cancel"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        className="flex items-center justify-center gap-1 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:bg-orange-200"
                        onClick={() => confirmMercariAuctionBid(bidAmount)}
                        disabled={loading || belowMin || overMax}
                        data-testid="support-quote-mercari-auction-btn-bid-confirm"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        确认出价 ¥{bidAmount.toLocaleString()}
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : null}
            <button
              type="button"
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-orange-700 shadow-sm disabled:opacity-50"
              onClick={() => consultQuote(quote)}
              disabled={loading}
              data-testid="support-quote-auction-btn-consult"
            >
              <MessageCircle className="h-4 w-4" />
              咨询
            </button>
          </div>
        ) : isYahooSokketsu && quote.purchasable !== false ? (
          // 雅虎即決（一口价）：NestJS 新后端已退役，「去小程序购买」改跳袋鼠君小程序雅虎
          // 详情页在老后台下单（方案①，2026-08-24），不再是纯联系客服文案。
          (() => {
            const riskBlocksBuy = Boolean(
              quote.seller_risk?.needs_confirm &&
                !quoteRiskConfirmed[cardKey],
            );
            return (
              <div className="mt-3" data-testid="support-quote-sokketsu-cta">
                <p className="rounded-md bg-orange-50 px-2.5 py-2 text-xs leading-5 text-orange-700">
                  {quote.action_text ||
                    "核对无误后可点下方按钮立即购买，先到先得。"}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-orange-700 shadow-sm disabled:opacity-50"
                    onClick={() => consultQuote(quote)}
                    disabled={loading}
                    data-testid="support-quote-sokketsu-btn-consult"
                  >
                    <MessageCircle className="h-4 w-4" />
                    咨询
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:bg-orange-200"
                    onClick={() => buyQuote(cardKey, quote)}
                    disabled={loading || riskBlocksBuy}
                    data-testid="support-quote-sokketsu-btn-buy"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    去小程序购买
                  </button>
                </div>
                {riskBlocksBuy ? (
                  <p className="mt-1.5 text-[11px] leading-4 text-slate-400">
                    请先在上方完成『高额订单风险确认』，再点『去小程序购买』。
                  </p>
                ) : null}
              </div>
            );
          })()
        ) : quote.purchasable === false ? (
          <div
            className="mt-3 flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-medium leading-5 text-red-700"
            data-testid="support-quote-unpurchasable"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {quote.unpurchasable_reason || "该商品暂时无法购买"}
          </div>
        ) : (
          (() => {
            // 风险闸：>5万需确认且买家尚未点确认时，禁用「我要购买」，逼买家先确认风险。
            const riskBlocksBuy = Boolean(
              quote.seller_risk?.needs_confirm &&
                !quoteRiskConfirmed[cardKey],
            );
            // 「加入购物车」三等分按钮区仅用于 mercari/rakuma/yahoofrima 的辅助链接报价卡
            // （雅虎竞拍卡/即決卡有各自的按钮分支，不经过这里）；且仅在小程序 webview 内展示——
            // 加购依赖顾客本人登录态，非 webview（PC 微信/浏览器直开）跳不进小程序，
            // 保持原两按钮布局，不显示加购、买按钮文案也不改。
            // 商品号缺失时同样不显示（拿不到 id 就跳不进详情页），按原两按钮布局兜底，不静默展示会失败的按钮。
            const canAddToCart = Boolean(
              quote.platform &&
                (quote.platform === "mercari" ||
                  ASSISTED_PURCHASE_PLATFORMS.has(quote.platform)) &&
                quote.item_id &&
                wxReady &&
                isMiniProgramWebview(),
            );
            const buyButtonLabel = canAddToCart ? "支付" : "我要购买";
            return (
              <div className="mt-3" data-testid="support-quote-cta">
                <p className="rounded-md bg-orange-50 px-2.5 py-2 text-xs leading-5 text-orange-700">
                  核对无误后可点下方按钮，或回复『确认』，我为您录入订单。
                </p>
                <div
                  className={
                    canAddToCart
                      ? "mt-2 grid grid-cols-3 gap-2"
                      : "mt-2 grid grid-cols-2 gap-2"
                  }
                >
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-orange-700 shadow-sm disabled:opacity-50"
                    onClick={() => consultQuote(quote)}
                    disabled={loading}
                    data-testid="support-quote-btn-consult"
                  >
                    <MessageCircle className="h-4 w-4" />
                    咨询
                  </button>
                  {canAddToCart ? (
                    <button
                      type="button"
                      className="flex items-center justify-center gap-1 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-orange-700 shadow-sm disabled:opacity-50"
                      onClick={() => addQuoteToCart(quote)}
                      disabled={loading}
                      data-testid="support-quote-btn-cart"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      加入购物车
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:bg-orange-200"
                    onClick={() => buyQuote(cardKey, quote)}
                    disabled={loading || riskBlocksBuy}
                    data-testid="support-quote-btn-buy"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {buyButtonLabel}
                  </button>
                </div>
                {riskBlocksBuy ? (
                  <p className="mt-1.5 text-[11px] leading-4 text-slate-400">
                    请先在上方完成『高额订单风险确认』，再点『{buyButtonLabel}』。
                  </p>
                ) : null}
                {quote.platform === "mercari" && quote.item_id && userId ? (
                  <button
                    type="button"
                    className="support-quote-btn-leavemsg mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-orange-700 shadow-sm disabled:opacity-50"
                    onClick={() => openLeaveMsgModal(cardKey, quote)}
                    disabled={loading}
                    data-testid="support-quote-btn-leavemsg"
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                    留言给卖家
                  </button>
                ) : null}
              </div>
            );
          })()
        )}
      </div>
    );
  };

  const renderChatItem = (item: ChatItem, key: string) => {
    // 待支付/订单卡金额：优先人民币；缺 amount_rmb 时回退显示日元 amount，
    // 别让买家看不到金额（曾因 amount_rmb 缺失整行消失）。
    const hasRmb = Boolean(item.orderRef?.amount_rmb);
    const amountText = hasRmb
      ? `¥${item.orderRef?.amount_rmb}`
      : item.orderRef?.amount
        ? `${item.orderRef.amount} 日元`
        : undefined;
    // 日元换算后缀只在主显示为人民币时附加，避免回退后重复「日元（约…日元）」。
    const jpyText =
      hasRmb && item.orderRef?.amount
        ? `（约 ${item.orderRef.amount} 日元）`
        : "";
    const canNavigateOrder = Boolean(
      item.orderRef?.order_id && wxReady && isMiniProgramWebview(),
    );

    // 单件报价卡判定（批量报价卡 quoteRefs 走 renderQuoteCard 内部各卡自算 isYahoo 等，互不影响）。
    const quote = item.quoteRef;

    // 已售/不可购报价卡：卡片内底部已有一条「不可购买原因」提示（含「已售」），
    // 文字气泡里的同义开场白会与之重复。此时隐藏上方文字气泡，只留卡片内那一条。
    const isUnpurchasableQuote = Boolean(quote && quote.purchasable === false);
    // 选择卡（核价确认 [确认下单] / 链接选择 [直接下单]/[咨询商品]）的 prompt 就是卡片
    // 内顶部那行字；bridge 同时把它放进 reply（→ item.content）。两者一字不差时，文字
    // 气泡与卡片内文字重复（花哥反馈：核价提示冒两遍）。此时隐藏气泡，只留带按钮的卡。
    // 报价卡不受影响：它的 reply 是简短开场白（≠卡内结构化字段），choiceRef 为空。
    const choicePromptEqualsContent = Boolean(
      item.choiceRef?.options?.length &&
        item.choiceRef.prompt &&
        item.choiceRef.prompt === item.content,
    );
    // 转人工卡（human-transfer-card）已在卡片内展示 humanTransferNote；bridge 把同一句话
    // 也放进 reply（→ item.content）。两者相同时隐藏重复的文字气泡，只留带按钮的转人工卡。
    const transferNoteEqualsContent = Boolean(
      humanTransferVisible &&
        humanTransferNote &&
        humanTransferNote === item.content,
    );
    const showTextBubble =
      Boolean(item.content) &&
      !isUnpurchasableQuote &&
      !choicePromptEqualsContent &&
      !transferNoteEqualsContent;

    return (
      <div
        key={key}
        className={`flex flex-col ${
          item.role === "user" ? "items-end" : "items-start"
        }`}
      >
        {showTextBubble ? (
          <div
            className={`max-w-[82%] whitespace-pre-line rounded-lg px-3 py-2 text-sm leading-6 shadow-sm ${
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
        {item.proxyBuyPayRef?.orderRef
          ? (() => {
              const ppay = item.proxyBuyPayRef;
              // 去支付可点：必须在小程序 webview（有顾客登录态）且已配置代拍支付页 path。
              // 任一不满足 → 按钮禁用 + 提示回小程序，绝不跳错页 / 绝不在客服 H5 直接调 JWT 收款。
              const canPayProxyBuy = Boolean(
                wxReady && isMiniProgramWebview() && PROXY_BUY_PAY_PAGE_PATH,
              );
              return (
                <div
                  className="mt-2 w-[82%] max-w-sm rounded-lg border border-orange-100 bg-white p-3 shadow-sm"
                  data-testid="support-proxy-buy-pay-card"
                >
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <ShoppingBag className="h-4 w-4 text-orange-500" />
                    待支付订单
                  </div>
                  {ppay.title ? (
                    <div className="line-clamp-2 text-sm leading-5 text-slate-700">
                      {ppay.title}
                    </div>
                  ) : null}
                  {ppay.amount_jpy !== undefined ? (
                    <div className="mt-2 text-sm font-medium text-slate-900">
                      应付 ¥{ppay.amount_jpy.toLocaleString("ja-JP")} 日元
                      {ppay.pay_amount !== undefined ? (
                        <span className="font-normal text-slate-500">
                          {" "}
                          （约 ¥{ppay.pay_amount.toLocaleString("zh-CN")}）
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {ppay.orderNo ? (
                    <div className="mt-1 text-xs leading-5 text-slate-500">
                      订单号：{ppay.orderNo}
                    </div>
                  ) : null}
                  {ppay.risk_flag ? (
                    <div
                      className="mt-2 flex items-start gap-1.5 rounded-md border border-red-300 bg-red-50 px-2.5 py-2 text-xs font-medium leading-4 text-red-700"
                      data-testid="support-proxy-buy-pay-risk"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      金额较大，请核对后支付。
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:bg-orange-200"
                    onClick={() => openProxyBuyPay(ppay)}
                    disabled={!canPayProxyBuy}
                    data-testid="support-proxy-buy-pay-btn"
                  >
                    去支付
                  </button>
                  {!canPayProxyBuy ? (
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {PROXY_BUY_PAY_PAGE_PATH
                        ? "请在袋鼠君小程序内打开后完成支付。"
                        : "支付入口待配置。"}
                    </p>
                  ) : null}
                </div>
              );
            })()
          : null}
        {item.listRef?.items?.length ? (
          <div
            className="mt-2 w-[82%] max-w-sm rounded-lg border border-orange-100 bg-white p-3 shadow-sm"
            data-testid="support-list-card"
          >
            {item.listRef.title ? (
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <ShoppingBag className="h-4 w-4 text-orange-500" />
                <span className="line-clamp-2">{item.listRef.title}</span>
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              {item.listRef.items.map((listItem) => (
                <button
                  key={listItem.order_id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md border border-orange-100 bg-orange-50 px-2.5 py-2 text-left disabled:opacity-60"
                  onClick={() => openListItem(listItem)}
                  disabled={loading}
                  data-testid={`support-list-item-${listItem.order_id}`}
                >
                  {listItem.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={listItem.cover}
                      alt={listItem.title || "商品图片"}
                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-orange-100 text-orange-400">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {listItem.title ? (
                      <div className="line-clamp-2 text-sm leading-5 text-slate-800">
                        {listItem.title}
                      </div>
                    ) : null}
                    <div className="mt-1 flex items-center justify-between gap-2">
                      {listItem.status_txt ? (
                        <span className="text-xs text-orange-600">
                          {listItem.status_txt}
                        </span>
                      ) : (
                        <span />
                      )}
                      {listItem.amount_rmb !== undefined ? (
                        <span className="text-xs font-medium text-slate-900">
                          ¥{listItem.amount_rmb.toLocaleString("zh-CN")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {item.listRef.has_prev || item.listRef.has_next ? (
              <div
                className="mt-2 flex items-center justify-between gap-2"
                data-testid="support-list-paging"
              >
                {item.listRef.has_prev ? (
                  <button
                    type="button"
                    className="flex-1 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-orange-700 disabled:opacity-60"
                    onClick={() => goListPage(item.listRef as ListRef, -1)}
                    disabled={loading}
                    data-testid="support-list-prev"
                  >
                    上一页
                  </button>
                ) : (
                  <span className="flex-1" />
                )}
                {item.listRef.page !== undefined &&
                item.listRef.total_pages !== undefined ? (
                  <span className="shrink-0 text-xs text-slate-400">
                    {item.listRef.page}/{item.listRef.total_pages}
                  </span>
                ) : null}
                {item.listRef.has_next ? (
                  <button
                    type="button"
                    className="flex-1 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-orange-700 disabled:opacity-60"
                    onClick={() => goListPage(item.listRef as ListRef, 1)}
                    disabled={loading}
                    data-testid="support-list-next"
                  >
                    下一页
                  </button>
                ) : (
                  <span className="flex-1" />
                )}
              </div>
            ) : null}
          </div>
        ) : null}
        {/* 批量报价卡（quoteRefs 非空）：bridge 攒清单回复一次带多件商品，每张卡渲染同款
             单件报价卡组件，按钮行为（consultQuote/buyQuote/goYahooBid）与单件一致。
             quoteRefs 缺省时回退单件 quoteRef，零回归。 */}
        {item.quoteRefs && item.quoteRefs.length > 0
          ? item.quoteRefs.map((q, qIdx) =>
              renderQuoteCard(q, `${key}-quote-${qIdx}`),
            )
          : item.quoteRef
            ? renderQuoteCard(item.quoteRef, key)
            : null}
        {/* 选择卡（choiceRef）挪到报价卡之后渲染（原先在报价卡之前）：
             攒单场景 bridge 同一条回复会带 quote_ref（刚加入的这件商品）+ choice（继续购买/
             去支付/咨询本批商品三按钮），先看到卡片内容、按钮作为紧跟其后的行动点更符合阅读
             顺序，也与本文件其它卡片"先内容后操作按钮"的一贯布局一致。原有的纯 choiceRef
             场景（不带 quoteRef）视觉上只是从"卡片列表最前"挪到"最后"，交互不变、零回归。 */}
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
        {/* 「留言给卖家」结构化卡片（leaveMsgRef，bridge 新增，与 quote_ref 同级）：买家未必
             先看到报价卡（如直接问"能便宜点吗"）时也能一步开留言弹窗。复用现有弹窗/state
             （openLeaveMsgModal），与报价卡第二排的「留言给卖家」按钮走同一路径，零冲突。
             仅 goods_no 非空才会解析出这张卡（见 getLeaveMsgRef），此处再叠一层 userId
             门槛（无登录态提交必失败，避免出一张点了没用的卡）。 */}
        {item.leaveMsgRef && userId ? (
          <div
            className="mt-2 w-[82%] max-w-sm rounded-lg border border-orange-100 bg-white p-3 shadow-sm"
            data-testid="support-leavemsg-ref-card"
          >
            {item.leaveMsgRef.link ? (
              <a
                href={item.leaveMsgRef.link}
                target="_blank"
                rel="noreferrer"
                className="mb-2 flex items-center gap-1 text-xs text-orange-600 underline"
              >
                <ExternalLink className="h-3 w-3" />
                查看商品
              </a>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={
                  item.leaveMsgRef.mode_hint === "bargain"
                    ? "flex items-center justify-center gap-1 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:bg-orange-200"
                    : "flex items-center justify-center gap-1 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-orange-700 disabled:opacity-50"
                }
                onClick={() =>
                  openLeaveMsgModal(
                    key,
                    {
                      platform: item.leaveMsgRef?.platform || "mercari",
                      item_id: item.leaveMsgRef?.goods_no,
                      price_jpy: item.leaveMsgRef?.price_jpy,
                    },
                    {
                      floorPriceJpy: item.leaveMsgRef?.floor_price_jpy,
                      link: item.leaveMsgRef?.link,
                      initialType: "bargain",
                      prefillAmountJpy: item.leaveMsgRef?.prefill_amount_jpy,
                    },
                  )
                }
                disabled={loading || item.leaveMsgRef.price_jpy === undefined}
                data-testid="leave-msg-ref-btn-bargain"
              >
                <HandCoins className="h-4 w-4" />
                帮我砍价
              </button>
              <button
                type="button"
                className={
                  item.leaveMsgRef.mode_hint === "consult"
                    ? "flex items-center justify-center gap-1 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:bg-orange-200"
                    : "flex items-center justify-center gap-1 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-orange-700 disabled:opacity-50"
                }
                onClick={() =>
                  openLeaveMsgModal(
                    key,
                    {
                      platform: item.leaveMsgRef?.platform || "mercari",
                      item_id: item.leaveMsgRef?.goods_no,
                      price_jpy: item.leaveMsgRef?.price_jpy,
                    },
                    {
                      floorPriceJpy: item.leaveMsgRef?.floor_price_jpy,
                      link: item.leaveMsgRef?.link,
                      initialType: "question",
                    },
                  )
                }
                disabled={loading}
                data-testid="leave-msg-ref-btn-consult"
              >
                <MessageSquarePlus className="h-4 w-4" />
                咨询卖家
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  // 横向永远铺满布局视口（left/right 钉 0），只纵向跟 visualViewport 钉位——
  // 键盘弹出时 visualViewport 的 offsetLeft/width 常年是 0/整屏，用它设横向反而可能
  // 把容器挤窄，导致发送按钮被裁出屏幕（真机实测）。纵向钉位逻辑（top/height 跟随
  // 键盘）不动，见上方 2026-08-13 的 visualViewport effect。
  const viewportStyle: CSSProperties = vpRect
    ? {
        position: "fixed",
        top: vpRect.top,
        left: 0,
        right: 0,
        height: vpRect.height,
      }
    : { position: "fixed", inset: 0, height: "100dvh" };

  return (
    <main
      className="flex min-h-0 flex-col overflow-hidden bg-[#f5f7fb] text-slate-900"
      style={viewportStyle}
      data-theme={isCandyTheme ? "candy" : undefined}
    >
      {isCandyTheme ? <style>{CANDY_THEME_CSS}</style> : null}
      <header className="sticky top-0 z-10 border-b bg-white/95 px-4 py-3 backdrop-blur">
        <div className="text-center text-base font-semibold">袋鼠酱</div>
        <div className="mt-1 text-center text-xs text-slate-500">
          我先陪你看，复杂问题可能需要一点时间；拿不准的事马上帮你找人工
        </div>
      </header>

      <section
        ref={messagesSectionRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-4"
      >
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
                {wecomKefuChatUrl
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
            {userId && uidSignature.sig && !reviewModeLoading && !reviewMode ? (
              <button
                type="button"
                className="rounded-md border border-orange-100 bg-orange-50 px-2 py-2 text-left text-xs text-orange-700"
                onClick={goMyAuctions}
                disabled={loading}
                data-testid="support-h5-mine-button"
              >
                我的竞拍
              </button>
            ) : null}
            {QUICK_QUESTIONS.filter(
              (question) =>
                !(
                  (reviewModeLoading || reviewMode) &&
                  (question === "怎么参与雅虎竞拍？" || question === "雅虎中标想弃标")
                ),
            ).map((question) => (
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
          代拍流程、费用、关税这些常见问题袋鼠酱基本秒回；个别复杂问题可能需要十几秒整理，请稍等一下。如果遇到退款、改地址、投诉、支付异常，或者需要确认订单的事，我会帮你转给人工客服处理。
        </div>
        <div ref={messagesBottomAnchorRef} />
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
          className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-base outline-none focus:border-orange-400"
          placeholder="请输入问题"
          maxLength={1000}
        />
        <button
          type="submit"
          className="flex h-10 w-11 shrink-0 items-center justify-center rounded-md bg-orange-500 text-white disabled:bg-orange-200"
          disabled={loading}
          aria-label="发送"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      {leaveMsgTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => {
            if (!leaveMsgSubmitting) closeLeaveMsgModal();
          }}
          data-testid="leave-msg-modal-backdrop"
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-lg"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
            onClick={(event) => event.stopPropagation()}
            data-testid="leave-msg-modal"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <MessageSquarePlus className="h-4 w-4 text-orange-500" />
                留言给卖家
              </div>
              <button
                type="button"
                className="rounded-full p-1 text-slate-400"
                onClick={closeLeaveMsgModal}
                aria-label="关闭"
                disabled={leaveMsgSubmitting}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {leaveMsgType === null ? (
              <div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={
                      leaveMsgTarget.quote.price_jpy === undefined
                        ? "flex flex-col items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-400"
                        : "flex flex-col items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-3 py-3 text-sm font-medium text-orange-700"
                    }
                    onClick={() => setLeaveMsgType("bargain")}
                    disabled={leaveMsgTarget.quote.price_jpy === undefined}
                    data-testid="leave-msg-type-bargain"
                  >
                    <HandCoins className="h-5 w-5" />
                    帮我砍价
                  </button>
                  <button
                    type="button"
                    className="flex flex-col items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-3 py-3 text-sm font-medium text-orange-700"
                    onClick={() => setLeaveMsgType("question")}
                    data-testid="leave-msg-type-question"
                  >
                    <MessageSquarePlus className="h-5 w-5" />
                    咨询卖家
                  </button>
                </div>
                {leaveMsgTarget.quote.price_jpy === undefined ? (
                  <p className="mt-2 text-[11px] leading-4 text-slate-400">
                    暂未获取到商品现价，无法代砍价，可先咨询卖家。
                  </p>
                ) : null}
              </div>
            ) : leaveMsgType === "bargain" ? (
              <div>
                <p className="text-sm text-slate-700">
                  现价 ¥
                  {leaveMsgTarget.quote.price_jpy !== undefined
                    ? leaveMsgTarget.quote.price_jpy.toLocaleString("ja-JP")
                    : "—"}{" "}
                  日元
                </p>
                <label className="mt-3 block text-xs font-medium text-slate-500">
                  期望价格（日元整数）
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  step={1}
                  value={leaveMsgTargetPrice}
                  onChange={(event) => setLeaveMsgTargetPrice(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-base text-slate-900 outline-none focus:border-orange-400"
                  placeholder="请输入整数日元金额"
                  disabled={leaveMsgSubmitting}
                  data-testid="leave-msg-bargain-input"
                />
                {leaveMsgTarget.floorPriceJpy !== undefined ||
                leaveMsgTarget.quote.price_jpy !== undefined ? (
                  <p className="mt-1 text-[11px] leading-4 text-slate-400">
                    最低可请求 ¥
                    {(
                      leaveMsgTarget.floorPriceJpy ??
                      leaveMsgBargainFloor(leaveMsgTarget.quote.price_jpy)
                    )?.toLocaleString("ja-JP")}{" "}
                    日元（现价的 80%），低于此价卖家大概率不会同意。
                  </p>
                ) : null}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-500">
                  想咨询卖家的问题
                </label>
                {/* 预设问题 chips：点击填入 textarea，仍可编辑后再提交，不直接发送。 */}
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {LEAVE_MSG_PRESET_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs text-orange-700 disabled:opacity-50"
                      onClick={() => setLeaveMsgQuestionText(question)}
                      disabled={leaveMsgSubmitting}
                      data-testid="leave-msg-preset-question"
                    >
                      {question}
                    </button>
                  ))}
                </div>
                <textarea
                  value={leaveMsgQuestionText}
                  onChange={(event) => setLeaveMsgQuestionText(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm leading-5 text-slate-900 outline-none focus:border-orange-400"
                  rows={3}
                  maxLength={500}
                  placeholder="例如：商品有没有明显瑕疵/能否补拍实物照片/是否可以拆分包裹发货"
                  disabled={leaveMsgSubmitting}
                  data-testid="leave-msg-question-input"
                />
              </div>
            )}

            {leaveMsgError ? (
              <p className="mt-2 rounded-md bg-red-50 px-2.5 py-2 text-xs leading-5 text-red-700">
                {leaveMsgError}
              </p>
            ) : null}

            {leaveMsgType !== null ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-orange-700 disabled:opacity-50"
                  onClick={() => {
                    setLeaveMsgType(null);
                    setLeaveMsgError("");
                  }}
                  disabled={leaveMsgSubmitting}
                >
                  返回
                </button>
                <button
                  type="button"
                  className="flex flex-1 items-center justify-center gap-1 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:bg-orange-200"
                  onClick={() => void submitLeaveMsg()}
                  disabled={leaveMsgSubmitting}
                  data-testid="leave-msg-submit"
                >
                  {leaveMsgSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  提交
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
