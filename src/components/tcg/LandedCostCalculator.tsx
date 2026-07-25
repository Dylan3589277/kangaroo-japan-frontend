"use client";

import { useMemo, useState } from "react";

/**
 * 到手价试算（en 专用）。
 *
 * 为什么做：fees 页七项费用全标 (estimated)，买家读完仍然算不出「除了卡价我还要付多少」，
 * 而美国买家对到手价极敏感（2025 年 $800 de minimis 取消后每单都要缴税）。
 *
 * 🔴 只算能算准的部分，绝不编数字：
 * - 商品价、日本国内运费、代购手续费、进口关税、承运商清关费 —— 这些有确定口径，算。
 * - **国际运费按实际重量计价**，站上没有权威的按卡数估重表，硬编一个数就是骗人 ——
 *   不算，单独标出「到仓称重后另计」，并说明它不进关税基数。
 *
 * 费率来源：汇率与代购费由服务端从公开 /exchange-rates 取真实值传入（不写死）；
 * 关税与清关费口径与 /en/guides/japan-card-import-tax-us-2026 保持一致，改那边记得同步。
 */

interface Props {
  /** 1 JPY 折合多少 USD（后台可调，取自 /exchange-rates 的 pairs.jpyToUsd）。 */
  jpyToUsd: number;
  /** 每件代购手续费（JPY 整数，取自 /exchange-rates 的 tcgServiceFeeJpy）。 */
  serviceFeeJpy: number;
}

/** 日本国内运费：多数卖家包邮，不包邮时典型值约 300 日元/件（与 fees 页口径一致）。 */
const DOMESTIC_SHIPPING_JPY = 300;
/** 2026-07-24 起 Section 301 对日本商品的税率；卡牌 MFN 为 Free，故实缴 12.5%。 */
const DUTY_RATE = 0.125;
/** Japan Post / EMS → USPS 的每件清关费，最常见也最便宜的清关路径。 */
const CLEARANCE_FEE_USD = 9.35;

function usd(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function LandedCostCalculator({ jpyToUsd, serviceFeeJpy }: Props) {
  const [priceInput, setPriceInput] = useState("3000");
  const [sellerShips, setSellerShips] = useState(true);

  const result = useMemo(() => {
    const priceJpy = Math.max(0, Math.round(Number(priceInput) || 0));
    const domesticJpy = sellerShips ? 0 : DOMESTIC_SHIPPING_JPY;
    // 日元侧全部按整数日元累加（金额一律 JPY 整数，不做分单位换算）。
    const japanSubtotalJpy = priceJpy + domesticJpy + serviceFeeJpy;

    const itemValueUsd = priceJpy * jpyToUsd;
    const japanSubtotalUsd = japanSubtotalJpy * jpyToUsd;
    // 关税基数只有商品价值本身——国际运费与保险单独申报时不计入。
    const dutyUsd = itemValueUsd * DUTY_RATE;
    const totalUsd = japanSubtotalUsd + dutyUsd + CLEARANCE_FEE_USD;

    return {
      priceJpy,
      domesticJpy,
      japanSubtotalJpy,
      japanSubtotalUsd,
      dutyUsd,
      totalUsd,
    };
  }, [priceInput, sellerShips, jpyToUsd, serviceFeeJpy]);

  const rows: { label: string; value: string; note?: string }[] = [
    {
      label: "Card price",
      value: usd(result.priceJpy * jpyToUsd),
      note: `¥${result.priceJpy.toLocaleString("en-US")}`,
    },
    {
      label: "Japan domestic shipping",
      value: usd(result.domesticJpy * jpyToUsd),
      note: result.domesticJpy === 0 ? "seller ships free" : `¥${DOMESTIC_SHIPPING_JPY}`,
    },
    {
      label: "Proxy service fee",
      value: usd(serviceFeeJpy * jpyToUsd),
      note: `¥${serviceFeeJpy.toLocaleString("en-US")} per item`,
    },
    {
      label: "U.S. import duty",
      value: usd(result.dutyUsd),
      note: "12.5% of card value",
    },
    {
      label: "Carrier clearance fee",
      value: usd(CLEARANCE_FEE_USD),
      note: "per parcel, Japan Post → USPS",
    },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-white">
        Estimate your landed cost
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        Everything except international shipping, which is charged by actual weight
        after your cards reach our Japan warehouse.
      </p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="block text-xs font-medium uppercase tracking-wider text-zinc-400">
            Card price on Mercari / Yahoo! (JPY)
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0e16] px-4 py-3 text-lg font-semibold text-white outline-none transition-colors focus:border-cyan-400/60"
            aria-label="Card price in Japanese yen"
          />
        </label>
        <label className="flex items-center gap-2 pb-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={sellerShips}
            onChange={(e) => setSellerShips(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-transparent accent-cyan-400"
          />
          Seller offers free domestic shipping
        </label>
      </div>

      <dl className="mt-6 divide-y divide-white/[0.06] border-y border-white/[0.06]">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between py-3">
            <dt className="text-sm text-zinc-300">
              {r.label}
              {r.note && (
                <span className="ml-2 text-xs text-zinc-500">{r.note}</span>
              )}
            </dt>
            <dd className="text-sm font-medium tabular-nums text-white">
              {r.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-white">
          Estimated total before international shipping
        </span>
        <span className="text-2xl font-bold tabular-nums text-cyan-300">
          {usd(result.totalUsd)}
        </span>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-zinc-500">
        Estimates only. International shipping is quoted after weighing at our Japan
        warehouse and is <strong className="font-medium text-zinc-400">not</strong> part
        of the duty base. Duty and clearance charges are assessed by U.S. Customs and
        your carrier — the final amount is always theirs, not ours. Consolidating
        several cards into one parcel spreads the clearance fee across all of them.
      </p>
    </div>
  );
}
