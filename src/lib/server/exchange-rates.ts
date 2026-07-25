/**
 * 服务端取公开汇率与 TCG 代购费，供 en 的到手价试算使用。
 *
 * 端点 `/api/v1/exchange-rates` 免鉴权（生产实测 200），返回形如：
 *   { pairs: { jpyToUsd: 0.0067, ... }, tcgServiceFeeJpy: 400, ... }
 *
 * 🔴 取真实值而不是把费率写死在前端：汇率与代购费都由后台随时可调
 * （source: "admin_override"），写死会让页面上的报价和实际结算对不上。
 * 取不到就返回 null，调用方**不渲染**试算器——宁可没有，也不给错数字。
 */

const BACKEND_ORIGIN = (
  process.env.KANGAROO_JAPAN_BACKEND_ORIGIN ||
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN ||
  "https://kangaroo-japan-backend.vercel.app"
).replace(/\/$/, "");

const TIMEOUT_MS = 3000;

export interface TcgPricingBasis {
  jpyToUsd: number;
  serviceFeeJpy: number;
}

export async function fetchTcgPricingBasis(): Promise<TcgPricingBasis | null> {
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/api/v1/exchange-rates`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // 汇率与费率是后台可调项，缓存 10 分钟：够挡住爬虫刷页，又不至于让调价长时间不生效。
      next: { revalidate: 600 },
    });
    if (!res.ok) {
      console.warn(`[exchange-rates] HTTP ${res.status} ${res.statusText}`);
      return null;
    }

    const json = (await res.json()) as {
      pairs?: { jpyToUsd?: number };
      rates?: { USD?: number };
      tcgServiceFeeJpy?: number | null;
    };

    const jpyToUsd = json?.pairs?.jpyToUsd ?? json?.rates?.USD;
    const serviceFeeJpy = json?.tcgServiceFeeJpy;

    // 两个值缺一不可，且必须是正数——否则算出来的是误导性的 $0.00。
    if (
      typeof jpyToUsd !== "number" ||
      !(jpyToUsd > 0) ||
      typeof serviceFeeJpy !== "number" ||
      !(serviceFeeJpy > 0)
    ) {
      console.warn(
        `[exchange-rates] unusable payload :: jpyToUsd=${jpyToUsd} serviceFeeJpy=${serviceFeeJpy}`,
      );
      return null;
    }

    return { jpyToUsd, serviceFeeJpy: Math.round(serviceFeeJpy) };
  } catch (e) {
    console.warn(
      `[exchange-rates] request failed :: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`,
    );
    return null;
  }
}
