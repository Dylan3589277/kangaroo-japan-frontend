/**
 * zh「费用试算」页国际运费的共享类型 + 纯计算函数（client / server 都能安全 import，
 * 不含任何网络请求 —— 请求部分在 `src/lib/server/shipping-rates.ts`）。
 *
 * 数据源背景：老后台（daishujun ThinkPHP）公开只读端点
 * `POST https://app.kangaroo-japan.com/api/ships/datas`（`app/api/controller/Ships.php::datas()`，
 * `noNeedLogin=['*']`，服务端 Redis 缓存 3600s），与小程序「运费计算」页
 * （`pages/bundle/calcfreight/calcfreight.vue`）同源同款，2026-08-06 读码+实测核验。
 * 返回按 `method_code`（EMS/AIR/SHIP）+ `area`（收货地区分组）+ `weight_limit`（克，梯度上限）
 * 分档的日本邮政官方运费表（JPY 整数），以及 `SHIP_EXCHANGE_RATE`（st_config，人工每日更新的
 * 运费专用汇率，已是最终乘数，前端不再自行叠加 +0.003，避免口径分裂）。
 */

export interface ShippingMethod {
  /** 老后台 method_code，字符串形态（如 "1"）。 */
  code: string;
  /** 方式名称，如 "EMS"／"標準航空/AIR"／"船运/SHIP"，直接来自老后台，不在前端翻译改写。 */
  name: string;
}

export interface ShippingCountry {
  id: number;
  name: string;
  /** 地区分组：决定用哪一档运费表，同一 area 内运费一致。 */
  area: number;
}

export interface ShippingTier {
  methodCode: string;
  area: number;
  /** 该档位可覆盖的最大重量（克）。 */
  weightLimitGrams: number;
  shipAmountJpy: number;
}

export interface ShippingRatesData {
  methods: ShippingMethod[];
  countries: ShippingCountry[];
  tiers: ShippingTier[];
  /** SHIP_EXCHANGE_RATE 现值，JPY→RMB 的运费专用汇率乘数。 */
  rate: number;
  /** 本次取数时间（ISO），非老后台费率本身的更新时间。 */
  fetchedAt: string;
}

/** zh 站默认收货地区：中国大陆（old 后台 area=1，同组含台湾/韩国）。 */
export const DEFAULT_SHIPPING_AREA = 1;

/**
 * 按方式 + 地区 + 重量查运费（JPY 整数）。
 *
 * 老后台梯度表语义是「weight_limit = 该档能覆盖的最大重量」，正确查法是取所有
 * `weight_limit >= 输入重量` 的档位里 weight_limit 最小的一档（即"刚好够用的最便宜档"）。
 * 重量超过该方式在此地区的最大档位时返回 null（超重，需人工报价）。
 *
 * 注：小程序 `calcfreight.vue` 的 `weightChange()` 用的是「遍历全部匹配档、最后一次
 * weight<=weight_limit 为真的即中选」，在档位不保证按输入顺序排序时可能选中错误档位；
 * 本函数改用显式取最小值，逻辑更稳健，属新写的前端展示层代码，不改动、不依赖小程序那份实现。
 */
export function lookupShippingCost(
  tiers: ShippingTier[],
  methodCode: string,
  area: number,
  weightGrams: number,
): number | null {
  if (!Number.isFinite(weightGrams) || weightGrams <= 0) return null;
  let best: ShippingTier | null = null;
  for (const tier of tiers) {
    if (tier.methodCode !== methodCode || tier.area !== area) continue;
    if (tier.weightLimitGrams < weightGrams) continue;
    if (!best || tier.weightLimitGrams < best.weightLimitGrams) {
      best = tier;
    }
  }
  return best ? best.shipAmountJpy : null;
}

/**
 * 预计时效（天）——口径与小程序费用试算页/底部「国际物流介绍」运营图一致
 * （EMS 3~14日／航空便 7~20日／船运 30~60日，2026-08-09 对齐）。评分用中值。
 * 老后台 method_code：1=EMS 2=標準航空 4=船运；未知 code 不参与最优评分。
 */
export const SHIP_DAYS_BY_CODE: Record<string, { lo: number; hi: number }> = {
  "1": { lo: 3, hi: 14 },
  "2": { lo: 7, hi: 20 },
  "4": { lo: 30, hi: 60 },
};

export interface MethodQuote {
  code: string;
  /** 展示名（来自老后台 ships，调用方可再做别名映射）。 */
  name: string;
  /** 该重量下运费（JPY 整数）；超重为 null。 */
  amountJpy: number | null;
  /** 时效文案，如 "3~14"；未知 code 为空串。 */
  daysText: string;
  /** 综合最优。全部超重时无最优。 */
  isBest: boolean;
}

/**
 * 对全部运输方式按重量出报价，并标「综合最优」——花哥 2026-08-09 拍板的标准：
 * 运费归一 ×50% + 时效中值归一 ×50%，可报价方式里得分最低者最优。
 * （2026-08-09 用生产费率表实测 area=1：全重量段最优均为 EMS——比航空快且大多更便宜，
 * 船运赢在绝对价格但时效惩罚大。权重若要向重货倾斜由花哥另行拍板。）
 */
export function quoteAllMethods(
  tiers: ShippingTier[],
  methods: ShippingMethod[],
  area: number,
  weightGrams: number,
): MethodQuote[] {
  const quotes: MethodQuote[] = methods.map((m) => {
    const d = SHIP_DAYS_BY_CODE[m.code];
    return {
      code: m.code,
      name: m.name,
      amountJpy: lookupShippingCost(tiers, m.code, area, weightGrams),
      daysText: d ? `${d.lo}~${d.hi}` : "",
      isBest: false,
    };
  });
  const scorable = quotes.filter(
    (q) => q.amountJpy != null && SHIP_DAYS_BY_CODE[q.code],
  );
  if (scorable.length > 0) {
    const minJ = Math.min(...scorable.map((q) => q.amountJpy as number));
    const minD = Math.min(
      ...scorable.map((q) => {
        const d = SHIP_DAYS_BY_CODE[q.code];
        return (d.lo + d.hi) / 2;
      }),
    );
    let best: MethodQuote | null = null;
    let bestScore = Infinity;
    for (const q of scorable) {
      const d = SHIP_DAYS_BY_CODE[q.code];
      const score =
        0.5 * ((q.amountJpy as number) / minJ) + 0.5 * ((d.lo + d.hi) / 2 / minD);
      if (score < bestScore) {
        bestScore = score;
        best = q;
      }
    }
    if (best) best.isBest = true;
  }
  return quotes;
}

/** 该方式 + 地区组合下，表里能报价的最大重量（克）；查不到组合时返回 null。 */
export function maxShippableGrams(
  tiers: ShippingTier[],
  methodCode: string,
  area: number,
): number | null {
  let max: number | null = null;
  for (const tier of tiers) {
    if (tier.methodCode !== methodCode || tier.area !== area) continue;
    if (max === null || tier.weightLimitGrams > max) max = tier.weightLimitGrams;
  }
  return max;
}
