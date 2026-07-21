/**
 * /[lang]/fee-compare —— 数据模块（三方比价费用页）。
 *
 * 铁律：本页所有数字（我方 + 友商）集中在这一个文件，页面组件只从这里取数渲染，
 * 不允许在 JSX 里散写数字。改价先改这里。
 *
 * 🔴 TODO（待老后台改价后接入）：我方数字目前是花哥拍板的目标值（手续费名义 200 円·现免 / 拍照
 * 200 円 / 仓储 30 天真实值），不是老后台 st_value_added 的当前实际值（旧值仍是 100 円等）。
 * 本页第一版刻意不接 `api.getMercariQuote()`（该接口是"按 goodsNo 查询单件报价"，
 * 会把增值服务价随手带出来，但没有一个"查当前费用表"的通用端点，且旧值会把目标值
 * 覆盖掉）。等运营在老后台把 st_value_added 改到目标价后，再考虑要不要把本页 our.*
 * 字段换成动态取数；届时数据源改法在 src/lib/api.ts 的 MercariQuote.valueAdded /
 * getMercariQuote() 附近查（GET /api/v1/mercari/quote?goodsNo=...）。
 *
 * 采集日期：2026-07-21。友商数据来自其官网公开费用页截图/页面文案（花哥提供口径），
 * 活动价随时可能变，页脚已加免责说明。
 */

/** 竞品脱敏代号：全页只出现这两个占位名，不出现竞品真实名称/域名。 */
export const COMPETITOR_A_NAME = "挖★姬";
export const COMPETITOR_B_NAME = "乐★番";
export const OUR_NAME = "袋鼠君";

/**
 * 袋鼠君亮点卡（资历 + 基础服务实价，纯我方展示，不与竞品比）。
 * 缘由（花哥 2026-07-21）：代购手续费三家都现免（都 0）、免费仓储我方真实 30 天（不硬拉 90，
 * 免得日本仓压力过大；且 30 天不占优），这两项拿去和竞品比是硬凑、没意义——改成只讲自己的
 * 资历（10 年代拍老店）和实价。
 */
export const BRAND_BADGE = "10年代拍老店";
export const HIGHLIGHTS: { label: string; value: string; note?: string }[] = [
  { label: "代购手续费", value: "200円 限免", note: "现 0" },
  { label: "免费仓储", value: "30天" },
];

export interface CompareRow {
  /** 对比维度标题 */
  label: string;
  /** 我方（主值，保持短，长说明放 *Sub 小字，避免移动端换行参差） */
  ours: string;
  oursSub?: string;
  /** 竞品 A（挖★姬） */
  competitorA: string;
  competitorASub?: string;
  /** 竞品 B（乐★番） */
  competitorB: string;
  competitorBSub?: string;
  /** 行内脚注（可选），渲染在该行下方 */
  footnote?: string;
  /** 数据来源说明（不渲染，供审计） */
  source: string;
}

// 注：代购手续费、免费仓储两项已移出对比表 → BRAND_BADGE/HIGHLIGHTS 亮点卡（见上），
// 手续费名义价对比仍在下方试算器。
export const COMPARE_ROWS: CompareRow[] = [
  {
    label: "客服方式",
    ours: "智能+真人客服",
    oursSub: "24小时",
    competitorA: "在线客服",
    competitorB: "人工客服·限时段",
    source: "花哥拍板：客服方式对比；⚠️挖★姬「机器人客服」据第三方用户反馈(黑猫/知乎)非官方口径，对外发布前需评估措辞法律风险；乐★番人工09:30-18:30+智能全天据官网，2026-07-21。",
  },
  {
    label: "帮砍价·代留言",
    ours: "免费",
    competitorA: "未单独标价",
    competitorB: "100~200円/次",
    source: "花哥口径；挖★姬未见单独收费项(推断自带)、乐★番议价100/咨询200円采集自官网，2026-07-21。",
  },
  {
    label: "商品拍照",
    ours: "200円·3张实拍",
    competitorA: "500円·6张",
    competitorB: "500円·标准版",
    source: "花哥拍板目标价 200 円（老后台 st_value_added 待改价）；友商采集自官网，2026-07-21。",
  },
  {
    label: "国际运费（EMS）",
    ours: "与日邮同价",
    oursSub: "不赚运费差价",
    competitorA: "日本邮政标准价",
    competitorB: "日本邮政标准价",
    footnote: "* EMS 为日本邮政统一费率，各家一致；我方不加价、不赚运费差。",
    source: "中枢 curl 生产 API 核验：我方 EMS 逐档与挖★姬完全相同（0.5kg 1450／5kg 6400），日邮统一价；乐★番同为日邮价（推断，未逐档采集）。2026-07-21。",
  },
  {
    label: "合并打包",
    ours: "合单免费·仅收箱材费",
    competitorA: "10单内免",
    competitorB: "3件内免",
    source: "花哥口径；友商价格采集自其官网公开费用页，2026-07-21。",
  },
  {
    label: "纠纷售后",
    ours: "真人跟进",
    competitorA: "需5日内开箱视频",
    competitorB: "按条款",
    source: "花哥口径；友商政策采集自其官网公开条款页，2026-07-21。",
  },
];

/** 页脚免责说明（友商数据时效） */
export const FOOTER_DISCLAIMER =
  "*友商数据采集自其官网公开费用页（2026年7月），活动价以各家页面为准。";

/**
 * 代购手续费试算器 —— 纯前端计算，按输入的商品价（JPY 整数）算出三家的手续费。
 * 公式来自花哥口径，采集日期同上（2026-07-21）。
 */
export interface CalculatorResult {
  ours: number;
  competitorA: number;
  competitorB: number;
}

/** 挖★姬手续费：<7000 → 200；7000~10000 → 3%；>10000 → 300（封顶） */
function competitorAFee(priceJpy: number): number {
  if (priceJpy < 7000) return 200;
  if (priceJpy <= 10000) return Math.round(priceJpy * 0.03);
  return 300;
}

/** 乐★番手续费：<7000 → 200；>=7000 → 3%，封顶 1000（当前活动免费，仅展示原价供对比） */
function competitorBFee(priceJpy: number): number {
  if (priceJpy < 7000) return 200;
  return Math.min(Math.round(priceJpy * 0.03), 1000);
}

/** 袋鼠君手续费：名义封顶 200 円（对客口径「200円 现免」，与对比表一致；不随价格上浮） */
function oursFee(_priceJpy: number): number {
  return 200;
}

export function calculateFees(priceJpy: number): CalculatorResult {
  const safePrice = Number.isFinite(priceJpy) && priceJpy > 0 ? priceJpy : 0;
  // 三家目前均在做手续费全免活动；此处按各家「名义费率」计算，供了解活动结束后的差异（口径统一，都是名义价）。
  return {
    ours: oursFee(safePrice),
    competitorA: competitorAFee(safePrice),
    competitorB: competitorBFee(safePrice),
  };
}
