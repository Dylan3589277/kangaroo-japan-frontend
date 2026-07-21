"use client";

/**
 * /[lang]/fee-compare 试算器 —— 纯前端计算，不调用任何接口。
 * 公式与数字集中在 fee-compare-data.ts（calculateFees），本组件只负责取输入、渲染结果。
 */

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  OUR_NAME,
  COMPETITOR_A_NAME,
  COMPETITOR_B_NAME,
  calculateFees,
} from "./fee-compare-data";

function formatJpy(value: number): string {
  return `¥${value.toLocaleString("ja-JP")}`;
}

export function FeeCalculator() {
  const [priceInput, setPriceInput] = useState("10000");

  const priceJpy = useMemo(() => {
    const parsed = Number(priceInput.replaceAll(",", ""));
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
  }, [priceInput]);

  const result = useMemo(() => calculateFees(priceJpy), [priceJpy]);

  const rows = [
    { name: OUR_NAME, fee: result.ours, us: true, note: "现免" },
    { name: COMPETITOR_A_NAME, fee: result.competitorA, us: false, note: "限时活动免" },
    { name: COMPETITOR_B_NAME, fee: result.competitorB, us: false, note: "公测免" },
  ];

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-zinc-900">代购手续费试算器</h2>
      <p className="mt-1 text-sm text-zinc-500">
        三家目前都在做手续费全免活动。下面按各家「名义费率」试算，看看活动结束后各收多少
      </p>

      <div className="mt-4">
        <Label htmlFor="fee-calc-price" className="text-sm text-zinc-600">
          商品价格（JPY）
        </Label>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-zinc-400">¥</span>
          <Input
            id="fee-calc-price"
            inputMode="numeric"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="10000"
            className="h-11 text-base"
          />
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {rows.map((row) => (
          <div
            key={row.name}
            className={
              row.us
                ? "flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
                : "flex items-center justify-between rounded-xl border px-4 py-3"
            }
          >
            <div>
              <span
                className={
                  row.us
                    ? "font-semibold text-rose-700"
                    : "font-medium text-zinc-700"
                }
              >
                {row.name}
              </span>
              {row.note ? (
                <span className="ml-2 text-xs text-zinc-400">{row.note}</span>
              ) : null}
            </div>
            <span
              className={
                row.us
                  ? "text-lg font-bold text-rose-600"
                  : "text-lg font-semibold text-zinc-800"
              }
            >
              {formatJpy(row.fee)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-zinc-400">
        表内为各家「名义费率」（三家当前均在做全免活动，实收 0）；仅为代购手续费对比，不含商品价格、国际运费与仓储等其它费用，实际以下单页最终报价为准。
      </p>
    </div>
  );
}
