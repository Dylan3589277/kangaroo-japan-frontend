import { api } from "@/lib/api";
import { normalizeYahooList } from "@/components/yahoo/yahoo-data";
import { searchMercariTcg } from "@/components/home/tcg/tcg-data";

/**
 * zh「导购式综合日本代购/代拍」首页数据层。
 *
 * 真实在售数据 = Mercari（煤炉）+ 雅虎竞拍 两路混合：
 *  - Mercari 走 GET /integrations/mercari/list?keyword=<enc>&page=1（复用 tcg-data.searchMercariTcg）。
 *  - 雅虎走 GET /yahoo/goods?kw=<enc>&lng=zh&sort=...&page=1（复用 yahoo-data.normalizeYahooList）。
 * 两路合并、去重、只留在售 + 有图，每品类取前 N 张。任一路失败/为空都不抛错（整块由调用方决定隐藏）。
 *
 * 金额一律 JPY 整数（数据库值即日元，不除以 100）。≈元 = JPY × 后台 jpyToCny 汇率（前端算）。
 * zh 站只显人民币，绝不显美元。
 */

export type ZhPlatform = "mercari" | "yahoo";

/** 首页商品卡统一数据（混合 Mercari + 雅虎后归一）。 */
export interface ZhHomeItem {
  /** 平台来源，决定徽章与跳转路由。 */
  platform: ZhPlatform;
  /** 旧系统商品号 / 拍卖号；用于详情跳转 /zh/mercari/[id] 或 /zh/yahoo/[goodsNo]。 */
  goodsNo: string;
  title: string;
  imageUrl?: string;
  /** 主价：JPY 整数。 */
  priceJpy?: number;
  /** 是否已售/已下架（置灰）。 */
  soldOut: boolean;
}

/** 去重键：平台 + 商品号（不同平台可能撞号，加前缀隔离）。 */
function dedupeKey(item: ZhHomeItem): string {
  return `${item.platform}:${item.goodsNo}`;
}

/**
 * 拉取某品类的 Mercari 在售卡并归一成 ZhHomeItem[]。失败/空返回 []。
 */
async function fetchMercariCategory(
  keyword: string,
  limit: number,
): Promise<ZhHomeItem[]> {
  try {
    const items = await searchMercariTcg({
      keyword,
      page: 1,
      inStockOnly: true, // 已剔除已售 + 无图
      limit,
    });
    return items.map((item) => ({
      platform: "mercari" as const,
      goodsNo: item.goodsNo,
      title: item.title,
      imageUrl: item.imageUrl,
      priceJpy: item.priceJpy,
      soldOut: item.soldOut,
    }));
  } catch {
    return [];
  }
}

/**
 * 拉取某品类的雅虎竞拍在售卡并归一成 ZhHomeItem[]。失败/空返回 []。
 * 复用雅虎搜索端点 /yahoo/goods（带 zh 关键词），归一后只留有图。
 */
async function fetchYahooCategory(
  keyword: string,
  limit: number,
): Promise<ZhHomeItem[]> {
  try {
    const query = new URLSearchParams({
      page: "1",
      kw: keyword,
      sort: "end_a",
      lng: "zh",
    });
    const res = await api.request<unknown>(`/yahoo/goods?${query.toString()}`);
    if (!res.success || !res.data) return [];

    const result = normalizeYahooList(res.data, 1);
    return result.items
      .filter((item) => Boolean(item.imageUrl))
      .slice(0, limit)
      .map((item) => ({
        platform: "yahoo" as const,
        goodsNo: item.goodsNo,
        title: item.titleTranslated || item.title,
        imageUrl: item.imageUrl,
        priceJpy: item.currentPrice,
        soldOut: false, // 雅虎在拍商品默认在售
      }));
  } catch {
    return [];
  }
}

/**
 * 交叉合并两路结果（Mercari / 雅虎交替排列，视觉上两平台都露脸），
 * 去重 + 只留有图，截断到 max。某一路为空时退化为另一路。
 */
function interleaveAndDedupe(
  mercari: ZhHomeItem[],
  yahoo: ZhHomeItem[],
  max: number,
): ZhHomeItem[] {
  const seen = new Set<string>();
  const out: ZhHomeItem[] = [];
  const longest = Math.max(mercari.length, yahoo.length);

  for (let i = 0; i < longest && out.length < max; i++) {
    for (const item of [mercari[i], yahoo[i]]) {
      if (!item || out.length >= max) continue;
      if (!item.imageUrl) continue;
      const key = dedupeKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

/**
 * 拉取一个品类的混合在售卡（Mercari + 雅虎并发），合并去重后取前 max 张。
 * 两路都失败/为空 → 返回 []（调用方据此隐藏整块，不留白）。
 * 注：每路单独取 perPlatform 张以保证混合后有足够候选；最终截断到 max。
 */
export async function fetchCategoryItems(
  keyword: string,
  max = 10,
): Promise<ZhHomeItem[]> {
  const perPlatform = max; // 每路多取一些，混合 + 去重后再截断
  const [mercari, yahoo] = await Promise.all([
    fetchMercariCategory(keyword, perPlatform),
    fetchYahooCategory(keyword, perPlatform),
  ]);
  return interleaveAndDedupe(mercari, yahoo, max);
}

/**
 * 拉取后台 CNY 汇率（公开端点 GET /api/v1/exchange-rates，经 api.request('/exchange-rates')）。
 * 返回 pairs.jpyToCny（默认约 0.05）。拿不到 → 返回 null（首页只显 JPY、不显 ≈元、不崩）。
 */
export async function fetchJpyToCny(): Promise<number | null> {
  try {
    const res = await api.getExchangeRates();
    const rate = res.success ? res.data?.pairs?.jpyToCny : undefined;
    if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
      return rate;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * JPY → ≈元（人民币）展示字符串。与现有 zh 详情口径一致：
 *  - 无汇率 / 无价 → 返回 null（不显 ≈元）。
 *  - ≥100 元取整数，<100 元保留 1 位小数（小额更精确，跟详情页风格一致）。
 */
export function formatCnyApprox(
  priceJpy: number | undefined,
  jpyToCny: number | null,
): string | null {
  if (typeof priceJpy !== "number" || !Number.isFinite(priceJpy)) return null;
  if (jpyToCny === null) return null;
  const cny = priceJpy * jpyToCny;
  if (!Number.isFinite(cny) || cny <= 0) return null;
  const display = cny >= 100 ? Math.round(cny).toString() : cny.toFixed(1);
  return `≈${display}元`;
}

/**
 * zh 代购手续费（约值，JPY/件）：仅用于未登录「预估到手价」展示。
 * 权威值在老后台 st_shops 可调，文案必须带「约」，绝不当承诺价。
 */
export const ZH_SERVICE_FEE_JPY_PER_ITEM = 100;

/**
 * 未登录「预估到手价」CNY 展示串（如 "≈123元"）：
 * (商品 JPY + 手续费约 100 JPY/件) × 公开汇率（GET /exchange-rates）。
 * 仅估算展示，必须配 ≈/预估 字样；不含国际运费（到仓称重后收取）。
 * 无价 / 无汇率 → null（调用方退化为「登录后查看」文案，绝不硬造静态汇率）。
 */
export function formatZhLandedEstimateCny(
  priceJpy: number | undefined,
  jpyToCny: number | null,
): string | null {
  if (
    typeof priceJpy !== "number" ||
    !Number.isFinite(priceJpy) ||
    priceJpy <= 0
  ) {
    return null;
  }
  return formatCnyApprox(priceJpy + ZH_SERVICE_FEE_JPY_PER_ITEM, jpyToCny);
}

/** 首页热门品类配置：标题 + 日文检索词（挑能出真货的词）。 */
export interface ZhCategoryConfig {
  key: string;
  title: string;
  keyword: string;
}

export const ZH_HOME_CATEGORIES: ZhCategoryConfig[] = [
  { key: "pokemon", title: "宝可梦卡牌", keyword: "ポケモンカード" },
  { key: "figure", title: "手办模型", keyword: "フィギュア" },
  { key: "jersey", title: "球衣 · 运动周边", keyword: "ユニフォーム" },
  { key: "toy", title: "潮玩 · 毛绒公仔", keyword: "ぬいぐるみ" },
];
