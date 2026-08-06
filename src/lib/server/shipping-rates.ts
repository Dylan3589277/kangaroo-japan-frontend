/**
 * 服务端取国际运费梯度表 + 运费专用汇率，供 `/fee-calculator` 页「运费区」使用。
 *
 * 端点背景、数据形状见 `src/lib/shipping-calc.ts` 头部注释。本文件只做网络请求 +
 * 归一化，供 Server Component 在渲染时直接 `await`（与 `zh-fee-estimate.ts` 的
 * `fetchZhFeeEstimateRates()` 同一模式）。老后台响应没有 `Access-Control-Allow-Origin`，
 * 浏览器直连会被 CORS 挡掉，所以必须走服务端转发，不能改成客户端直接 fetch。
 *
 * 三件套（rule external-call-resilience）：5s 超时 + Next fetch 缓存 30 分钟
 * （老后台自身已 Redis 缓存 3600s，这里不必更频繁）+ 任何失败一律 fail-closed 返回
 * null，调用方按「运费数据暂时无法获取」降级，绝不用非法值算出误导性金额。
 */

import type {
  ShippingCountry,
  ShippingMethod,
  ShippingRatesData,
  ShippingTier,
} from "@/lib/shipping-calc";

const LEGACY_SHIPS_ENDPOINT = "https://app.kangaroo-japan.com/api/ships/datas";
const TIMEOUT_MS = 5000;
const REVALIDATE_SECONDS = 1800;

interface RawShipMethod {
  method_code?: unknown;
  method_name?: unknown;
  is_deleted?: unknown;
}
interface RawCountry {
  id?: unknown;
  name?: unknown;
  area?: unknown;
  is_show?: unknown;
}
interface RawPriceTier {
  method_code?: unknown;
  area?: unknown;
  weight_limit?: unknown;
  ship_amount?: unknown;
}
interface RawShipsDatasResponse {
  code?: number;
  errmsg?: string;
  data?: {
    ships?: RawShipMethod[];
    countrys?: RawCountry[];
    prices?: RawPriceTier[];
    rate?: unknown;
  };
}

export async function fetchShippingRates(): Promise<ShippingRatesData | null> {
  try {
    const res = await fetch(LEGACY_SHIPS_ENDPOINT, {
      method: "POST",
      // 老后台按 APPID 头区分小程序版本做运营位过滤，本请求只取运费表，
      // 与版本无关字段，固定传新版 appid（与前端「以 candy 为准」的既有做法一致）。
      headers: { APPID: "wx4496935bdcce605e" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      console.warn(`[shipping-rates] HTTP ${res.status} ${res.statusText}`);
      return null;
    }

    const json = (await res.json()) as RawShipsDatasResponse;
    if (json?.code !== 0 || !json.data) {
      console.warn(
        `[shipping-rates] legacy response code=${json?.code} errmsg=${json?.errmsg}`,
      );
      return null;
    }

    const { ships, countrys, prices, rate } = json.data;
    if (!Array.isArray(ships) || !Array.isArray(countrys) || !Array.isArray(prices)) {
      console.warn("[shipping-rates] malformed payload — missing arrays");
      return null;
    }

    const rateNum = Number(rate);
    if (!Number.isFinite(rateNum) || rateNum <= 0) {
      console.warn("[shipping-rates] malformed SHIP_EXCHANGE_RATE — discarding");
      return null;
    }

    const methods: ShippingMethod[] = ships
      .filter((s) => Number(s.is_deleted) === 0 && s.method_code != null && s.method_name)
      .map((s) => ({ code: String(s.method_code), name: String(s.method_name) }));

    const countries: ShippingCountry[] = countrys
      .filter((c) => Number(c.is_show) === 1 && c.id != null && c.name != null)
      .map((c) => ({
        id: Number(c.id),
        name: String(c.name),
        area: Number(c.area),
      }))
      .filter((c) => Number.isFinite(c.id) && Number.isFinite(c.area));

    const tiers: ShippingTier[] = prices
      .map((p) => ({
        methodCode: String(p.method_code),
        area: Number(p.area),
        weightLimitGrams: Number(p.weight_limit),
        shipAmountJpy: Number(p.ship_amount),
      }))
      .filter(
        (t) =>
          Number.isFinite(t.area) &&
          Number.isFinite(t.weightLimitGrams) &&
          Number.isFinite(t.shipAmountJpy) &&
          t.shipAmountJpy > 0,
      );

    if (methods.length === 0 || tiers.length === 0) {
      console.warn("[shipping-rates] empty methods/tiers after normalization");
      return null;
    }

    return {
      methods,
      countries,
      tiers,
      rate: rateNum,
      fetchedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.warn(
      `[shipping-rates] request failed :: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`,
    );
    return null;
  }
}
