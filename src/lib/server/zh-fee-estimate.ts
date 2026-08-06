/**
 * 服务端取 zh 到手价试算的计价常量，供 `/fee-compare` 页的「到手价试算」区块使用。
 *
 * 端点 `/api/v1/zh-fee-estimate/rates` 免鉴权。老后台（daishujun ThinkPHP）没有任何
 * 公开的「查当前计价常量」端点（已用 M4 只读跳板核实：`ADMIN_READONLY_PROXY_SECRET`
 * 鉴权的 readonly API 只有订单/单件报价路由，没有裸的汇率/费率查询路由），本卡又
 * 禁止改老后台，所以现代后台按任务书允许的降级方案实现——手动同步的常量 +
 * `asOf` 标注同步日期，不是实时汇率。公式与常量来源见后端
 * `src/zh-fee-estimate/zh-fee-estimate.service.ts` 头部注释（含老后台文件:行号摘录）。
 *
 * 🔴 取不到就返回 null，调用方按「暂时无法估算」降级，绝不用非法值算出误导性金额。
 */

const BACKEND_ORIGIN = (
  process.env.KANGAROO_JAPAN_BACKEND_ORIGIN ||
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN ||
  "https://kangaroo-japan-backend.vercel.app"
).replace(/\/$/, "");

const TIMEOUT_MS = 5000;

export interface ZhFeeEstimateShopFees {
  mercari: number;
  yahooAuction: number;
  yahooFrima: number;
  rakuma: number;
  amazonJp: number;
}

export interface ZhFeeEstimateRates {
  baseRate: number;
  memberRateAdd: number;
  nonMemberRateAdd: number;
  shopFeesJpy: ZhFeeEstimateShopFees;
  agencyFeeJpy: { nominal: number; current: number };
  asOf: string;
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export async function fetchZhFeeEstimateRates(): Promise<ZhFeeEstimateRates | null> {
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/api/v1/zh-fee-estimate/rates`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // 常量是人工同步的（不是实时行情），缓存 5 分钟足够，也避免频繁打后端。
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.warn(`[zh-fee-estimate] HTTP ${res.status} ${res.statusText}`);
      return null;
    }

    const json = (await res.json()) as {
      available?: boolean;
      baseRate?: number;
      memberRateAdd?: number;
      nonMemberRateAdd?: number;
      shopFeesJpy?: Partial<ZhFeeEstimateShopFees>;
      agencyFeeJpy?: { nominal?: number; current?: number };
      asOf?: string;
    };

    if (!json?.available) {
      return null;
    }

    const fees = json.shopFeesJpy;
    const agency = json.agencyFeeJpy;

    const valid =
      isPositiveFiniteNumber(json.baseRate) &&
      isNonNegativeFiniteNumber(json.memberRateAdd) &&
      isNonNegativeFiniteNumber(json.nonMemberRateAdd) &&
      fees &&
      isNonNegativeFiniteNumber(fees.mercari) &&
      isNonNegativeFiniteNumber(fees.yahooAuction) &&
      isNonNegativeFiniteNumber(fees.yahooFrima) &&
      isNonNegativeFiniteNumber(fees.rakuma) &&
      isNonNegativeFiniteNumber(fees.amazonJp) &&
      agency &&
      isNonNegativeFiniteNumber(agency.nominal) &&
      isNonNegativeFiniteNumber(agency.current) &&
      typeof json.asOf === "string" &&
      json.asOf.length > 0;

    if (!valid) {
      console.warn("[zh-fee-estimate] unusable payload", json);
      return null;
    }

    return {
      baseRate: json.baseRate as number,
      memberRateAdd: json.memberRateAdd as number,
      nonMemberRateAdd: json.nonMemberRateAdd as number,
      shopFeesJpy: fees as ZhFeeEstimateShopFees,
      agencyFeeJpy: agency as { nominal: number; current: number },
      asOf: json.asOf as string,
    };
  } catch (e) {
    console.warn(
      `[zh-fee-estimate] request failed :: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`,
    );
    return null;
  }
}
