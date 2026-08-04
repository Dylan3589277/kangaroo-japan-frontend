"use client";

/**
 * /[lang]/fee-compare 到手价试算区块——花哥 2026-08-04 拍板加做。
 *
 * 与同页 FeeCalculator（纯前端、只比三家「代购手续费」名义价）不同：本区块算的是
 * 「这件商品到手要花多少人民币」，公式与数字来自老后台真实计价口径（读码实证，
 * 见后端 src/fee-estimate/fee-estimate.service.ts 顶部注释）：
 *   amount_jpy = 商品价 + 支付手续费(平台) + 代拍手续费(会员等级，现免=0)
 *   amount_rmb = amount_jpy × 汇率(EXCHANGE_RATE + 等级汇率增幅，老后台每日更新)
 * 不含国际运费（称重后另计，SHIP_EXCHANGE_RATE，未接入本试算器）。
 *
 * 🔴 没有「会员/非会员」切换：读码 + 库实证（2026-08-04）发现老后台 st_user_levels
 * 四档会员当前 rate/fee 完全相同（0.0025 / 0），客服话术里「非会员+0.006/会员+0.003」
 * 的说法在当前代码里查无实据（0.003 实为 SHIP_EXCHANGE_RATE 与 EXCHANGE_RATE 之差，
 * 用于国际运费换算，跟商品款换算汇率是两回事）。如果加一个当前不产生任何差异的切换，
 * 等于展示一个假选项——所以先不做，交付报告里已把这条分歧原样报给花哥定夺。
 *
 * 数据来自公开只读端点 GET /api/v1/fee-estimate（无需登录），5 分钟服务端缓存；
 * 拿不到汇率（老后台不可达/超时/未配置）时显著提示「暂时无法估算」，绝不出 NaN。
 */

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type FeeEstimatePlatform, type FeeEstimateResponse } from "@/lib/api";

const PLATFORM_OPTIONS: { value: FeeEstimatePlatform; label: string }[] = [
  { value: "mercari", label: "煤炉 メルカリ" },
  { value: "yahoo", label: "雅虎竞拍 ヤフオク" },
  { value: "yahoofrima", label: "雅虎フリマ" },
  { value: "rakuma", label: "乐天Rakuma ラクマ" },
  { value: "amazon", label: "日亚 Amazon" },
];

const DEBOUNCE_MS = 400;

function formatJpy(value: number): string {
  return `¥${value.toLocaleString("ja-JP")}`;
}

function formatRmb(value: number): string {
  return `¥${value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatRateAsOf(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

type NetState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "error" }
  | { status: "ok"; data: Extract<FeeEstimateResponse, { available: true }> };

export function LandedCostEstimator() {
  const [priceInput, setPriceInput] = useState("10000");
  const [platform, setPlatform] = useState<FeeEstimatePlatform>("mercari");
  const [netState, setNetState] = useState<NetState>({ status: "idle" });

  const priceJpy = useMemo(() => {
    const parsed = Number(priceInput.replaceAll(",", ""));
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
  }, [priceInput]);

  // 价格未填/非法时不发请求，直接由渲染层按 priceJpy<=0 显示「输入商品价格查看估算」，
  // 不在 effect 里同步 setState（react-hooks/set-state-in-effect）。
  useEffect(() => {
    if (priceJpy <= 0) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setNetState({ status: "loading" });
        try {
          const res = await api.getFeeEstimate(platform, priceJpy);
          if (cancelled) return;
          if (res.success && res.data?.available) {
            setNetState({ status: "ok", data: res.data });
          } else {
            setNetState({ status: "unavailable" });
          }
        } catch {
          if (!cancelled) setNetState({ status: "error" });
        }
      })();
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [platform, priceJpy]);

  const state: NetState = priceJpy <= 0 ? { status: "idle" } : netState;

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-zinc-900">到手价试算</h2>
      <p className="mt-1 text-sm text-zinc-500">
        输入商品价格和下单平台，估算折合人民币要花多少（不含国际运费）
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="landed-cost-price" className="text-sm text-zinc-600">
            商品价格（JPY）
          </Label>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-zinc-400">¥</span>
            <Input
              id="landed-cost-price"
              inputMode="numeric"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="10000"
              className="h-11 text-base"
            />
          </div>
        </div>
        <div>
          <Label className="text-sm text-zinc-600">下单平台</Label>
          <Select
            value={platform}
            onValueChange={(value) =>
              value && setPlatform(value as FeeEstimatePlatform)
            }
          >
            <SelectTrigger className="mt-1.5 h-11 w-full text-base">
              <SelectValue>
                {() =>
                  PLATFORM_OPTIONS.find((o) => o.value === platform)?.label
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PLATFORM_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-5">
        {state.status === "idle" && (
          <p className="rounded-xl bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-400">
            输入商品价格查看估算
          </p>
        )}
        {state.status === "loading" && (
          <p className="rounded-xl bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-400">
            正在估算…
          </p>
        )}
        {(state.status === "unavailable" || state.status === "error") && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-700">
            暂时无法估算，请稍后再试或直接联系客服报价
          </p>
        )}
        {state.status === "ok" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm">
              <span className="text-zinc-500">商品款</span>
              <span className="font-medium text-zinc-800">
                {formatJpy(state.data.priceJpy)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm">
              <span className="text-zinc-500">支付手续费</span>
              <span className="font-medium text-zinc-800">
                {formatJpy(state.data.shopFeeJpy)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm">
              <span className="text-zinc-500">
                代拍手续费
                <span className="ml-1.5 text-xs text-rose-500">
                  {state.data.levelFeeJpy === 0 ? "现免" : ""}
                </span>
              </span>
              <span className="font-medium text-zinc-800">
                {formatJpy(state.data.levelFeeJpy)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm">
              <span className="text-zinc-500">小计（JPY）</span>
              <span className="font-medium text-zinc-800">
                {formatJpy(state.data.amountJpy)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-3">
              <div>
                <span className="font-semibold text-rose-700">
                  预估到手价（人民币）
                </span>
                <div className="mt-0.5 text-xs text-rose-500">
                  汇率 {state.data.rate.toFixed(4)}（
                  {formatRateAsOf(state.data.rateAsOf)} 取数）
                </div>
              </div>
              <span className="text-2xl font-bold text-rose-600">
                {formatRmb(state.data.amountRmb)}
              </span>
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-zinc-400">
        以上为预估值，
        <strong className="font-medium text-zinc-500">
          国际运费到仓称重后另计，不含在内
        </strong>
        ；下单页实付以老后台按元向上取整为准（本页保留两位小数仅供参考）。最终以下单页实际金额为准。
      </p>
    </div>
  );
}
