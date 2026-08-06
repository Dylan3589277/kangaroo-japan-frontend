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
