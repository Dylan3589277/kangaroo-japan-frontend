"use client";

/**
 * `/[lang]/fee-calculator` 主体 —— 花哥 2026-08-06 拍板的「完整费用试算器」。
 *
 * 与 `/fee-compare` 页两个既有试算组件的关系（不重写计费，只新组合展示层）：
 * - 商品款/支付手续费/代拍手续费/小计/到手价（JPY→RMB）这段，直接复用
 *   `api.getFeeEstimate()`——与 `fee-compare/LandedCostEstimator.tsx` 调的是同一个
 *   函数、同一条后端公式（后端 `fee-estimate.service.ts`），本文件没有重新实现任何
 *   计价逻辑，只是把结果和运费拼在一起、多算一个总计。
 * - `fee-compare/FeeCalculator.tsx`（三家「名义费率」对比）是比价工具，跟"这单我
 *   到底要花多少"是不同问题，本页不复用、不重复。
 * - 国际运费是本页新增能力：数据源见 `src/lib/shipping-calc.ts` 头部注释
 *   （老后台 `api/ships/datas`，与小程序「运费计算」页同源）。
 * - 增值服务（打包带/防水膜/中箱/大箱/错发漏发检查/入库前拍照）是真实计价项，服务端
 *   实时拉老后台 `st_value_added` 表（`src/lib/server/value-added.ts`，失败回落
 *   `src/lib/value-added-services.ts` 硬编码快照），随 `initialValueAddedServices`
 *   prop 传入，本文件按 `type` 字段分 order（下单按件）/ship（出库按次）两组分组
 *   勾选，真实计入费用明细与总计，不在本文件里写死 id 或价格。
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
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
import {
  DEFAULT_SHIPPING_AREA,
  lookupShippingCost,
  maxShippableGrams,
  quoteAllMethods,
  type ShippingMethod,
  type ShippingRatesData,
} from "@/lib/shipping-calc";
import type { ActivePromo } from "@/lib/promo-config";
import type { ValueAddedService } from "@/lib/value-added-services";

const PLATFORM_OPTIONS: { value: FeeEstimatePlatform; label: string }[] = [
  { value: "mercari", label: "煤炉 メルカリ" },
  { value: "yahoo", label: "雅虎竞拍 ヤフオク" },
  { value: "yahoofrima", label: "雅虎フリマ" },
  { value: "rakuma", label: "乐天Rakuma ラクマ" },
  { value: "amazon", label: "日亚 Amazon" },
];

/** 已知 method_code 的展示名做统一简体中文优化；未知 code 原样用老后台返回的 name（兜底，不会因为新增方式而失效）。 */
const METHOD_LABEL_OVERRIDE: Record<string, string> = {
  "1": "EMS 特快专递",
  "2": "标准航空/AIR",
  "4": "船运/SHIP",
};
function methodLabel(m: ShippingMethod): string {
  return METHOD_LABEL_OVERRIDE[m.code] ?? m.name;
}

const DEBOUNCE_MS = 400;

function formatJpy(value: number): string {
  return `¥${Math.round(value).toLocaleString("ja-JP")}`;
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
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

type FeeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "error" }
  | { status: "ok"; data: Extract<FeeEstimateResponse, { available: true }> };

export function FeeCalculatorApp({
  initialShippingRates,
  initialValueAddedServices,
  activePromo,
}: {
  initialShippingRates: ShippingRatesData | null;
  initialValueAddedServices: ValueAddedService[];
  activePromo: ActivePromo | null;
}) {
  const [priceInput, setPriceInput] = useState("10000");
  const [platform, setPlatform] = useState<FeeEstimatePlatform>("mercari");
  const [weightInput, setWeightInput] = useState("1000");
  const [methodCode, setMethodCode] = useState(
    () => initialShippingRates?.methods[0]?.code ?? "",
  );
  // 用户是否手选过运输方式：没手选就自动跟随「综合最优」（重量变化时最优可能变），
  // 手选过则尊重手选（除非该方式超重不可报价，见 effectiveMethodCode 派生逻辑）——
  // 与小程序费用试算页同行为。
  const [methodPicked, setMethodPicked] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<number>>(() => new Set());
  const [feeState, setFeeState] = useState<FeeState>({ status: "idle" });

  const priceJpy = useMemo(() => {
    const parsed = Number(priceInput.replaceAll(",", ""));
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
  }, [priceInput]);

  const weightGrams = useMemo(() => {
    const parsed = Number(weightInput.replaceAll(",", ""));
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
  }, [weightInput]);

  function toggleService(id: number) {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // 两组分类按 type 字段分（不写死 id），服务列表来自 props（实时接口，失败已在
  // 服务端回落硬编码快照，本组件不需要再关心数据来源）。
  const orderServices = useMemo(
    () => initialValueAddedServices.filter((s) => s.type === "order"),
    [initialValueAddedServices],
  );
  const shipServices = useMemo(
    () => initialValueAddedServices.filter((s) => s.type === "ship"),
    [initialValueAddedServices],
  );

  // 增值服务合计：order 类随商品款一起结（用 fee.data.rate 折 RMB），ship 类随运费一起结
  // （用运费专用汇率折 RMB）——两个汇率是老后台两个各自维护的配置，不混用一个数字。
  const selectedServices = useMemo(
    () => initialValueAddedServices.filter((s) => selectedServiceIds.has(s.id)),
    [initialValueAddedServices, selectedServiceIds],
  );
  const valueAddedOrderJpy = selectedServices
    .filter((s) => s.type === "order")
    .reduce((sum, s) => sum + s.priceJpy, 0);
  const valueAddedShipJpy = selectedServices
    .filter((s) => s.type === "ship")
    .reduce((sum, s) => sum + s.priceJpy, 0);
  const valueAddedTotalJpy = valueAddedOrderJpy + valueAddedShipJpy;

  // 商品款/手续费：与 LandedCostEstimator 同一个 api.getFeeEstimate() 调用，防抖 400ms。
  useEffect(() => {
    if (priceJpy <= 0) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setFeeState({ status: "loading" });
        try {
          const res = await api.getFeeEstimate(platform, priceJpy);
          if (cancelled) return;
          if (res.success && res.data?.available) {
            setFeeState({ status: "ok", data: res.data });
          } else {
            setFeeState({ status: "unavailable" });
          }
        } catch {
          if (!cancelled) setFeeState({ status: "error" });
        }
      })();
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [platform, priceJpy]);

  const fee: FeeState = priceJpy <= 0 ? { status: "idle" } : feeState;

  // 三线路同屏报价 + 「综合最优」标记（运费×50% + 时效×50% 归一评分，
  // 见 quoteAllMethods 头注；花哥 2026-08-09 拍板与小程序费用试算页对齐）。
  const methodQuotes = useMemo(() => {
    if (!initialShippingRates || weightGrams <= 0) return [];
    return quoteAllMethods(
      initialShippingRates.tiers,
      initialShippingRates.methods,
      DEFAULT_SHIPPING_AREA,
      weightGrams,
    );
  }, [initialShippingRates, weightGrams]);

  // 生效方式=派生值（不用 effect 同步 state，过本仓 react-hooks/set-state-in-effect 规则）：
  // 未手选 → 跟随「综合最优」；手选过且该方式当前可报价 → 尊重手选；
  // 手选方式在当前重量下超重 → 回落最优（不能停在报不了价的选项上）。
  const effectiveMethodCode = useMemo(() => {
    if (methodQuotes.length === 0) return methodCode;
    const current = methodQuotes.find((q) => q.code === methodCode);
    if (methodPicked && current && current.amountJpy != null) return methodCode;
    return methodQuotes.find((q) => q.isBest)?.code ?? methodCode;
  }, [methodQuotes, methodCode, methodPicked]);

  const shippingJpy = useMemo(() => {
    if (!initialShippingRates || !effectiveMethodCode || weightGrams <= 0) return null;
    return lookupShippingCost(
      initialShippingRates.tiers,
      effectiveMethodCode,
      DEFAULT_SHIPPING_AREA,
      weightGrams,
    );
  }, [initialShippingRates, effectiveMethodCode, weightGrams]);

  const shippingMaxGrams = useMemo(() => {
    if (!initialShippingRates || !effectiveMethodCode) return null;
    return maxShippableGrams(
      initialShippingRates.tiers,
      effectiveMethodCode,
      DEFAULT_SHIPPING_AREA,
    );
  }, [initialShippingRates, effectiveMethodCode]);

  const shippingRmb = useMemo(() => {
    if (shippingJpy == null || !initialShippingRates) return null;
    return round2(shippingJpy * initialShippingRates.rate);
  }, [shippingJpy, initialShippingRates]);

  const grandTotalJpy =
    fee.status === "ok" && shippingJpy != null
      ? fee.data.amountJpy + shippingJpy + valueAddedTotalJpy
      : null;
  const grandTotalRmb =
    fee.status === "ok" && shippingRmb != null && initialShippingRates
      ? round2(
          fee.data.amountRmb +
            shippingRmb +
            valueAddedOrderJpy * fee.data.rate +
            valueAddedShipJpy * initialShippingRates.rate,
        )
      : null;

  // 活动横幅「代拍手续费是否全免」优先用实时数据；实时数据还没回来/取不到时用配置兜底。
  const agencyFeeWaived =
    fee.status === "ok" ? fee.data.levelFeeJpy === 0 : (activePromo?.agencyFeeWaived ?? false);

  return (
    <div className="space-y-6">
      {activePromo && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-white">
              {activePromo.title}
            </span>
            <span className="text-sm font-semibold text-amber-800">
              {activePromo.startDate} ~ {activePromo.endDate}
            </span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-amber-800">
            <li>
              · 代拍手续费
              {agencyFeeWaived ? "全免" : `原价 ¥${activePromo.agencyFeeNominalJpy}`}
              {agencyFeeWaived && (
                <span className="ml-1 text-xs text-amber-600">
                  （原价 ¥{activePromo.agencyFeeNominalJpy}/件）
                </span>
              )}
            </li>
            <li>· {activePromo.agencyRateAddText}</li>
            <li>· {activePromo.shippingRateAddText}</li>
            <li>· {activePromo.nightDiscountText}</li>
          </ul>
        </div>
      )}

      {/* 输入区 */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-zinc-900">商品信息</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="fc-price" className="text-sm text-zinc-600">
              商品价格（JPY）
            </Label>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-zinc-400">¥</span>
              <Input
                id="fc-price"
                inputMode="numeric"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="10000"
                className="h-11 text-base"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm text-zinc-600">购物平台</Label>
            <Select
              value={platform}
              onValueChange={(value) => value && setPlatform(value as FeeEstimatePlatform)}
            >
              <SelectTrigger className="mt-1.5 h-11 w-full text-base">
                <SelectValue>
                  {() => PLATFORM_OPTIONS.find((o) => o.value === platform)?.label}
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
          <p className="text-sm font-medium text-zinc-700">下单时可选服务（按件）</p>
          <div className="mt-2 space-y-2">
            {orderServices.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm has-[:checked]:border-rose-300 has-[:checked]:bg-rose-50"
              >
                <span className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={selectedServiceIds.has(s.id)}
                    onChange={() => toggleService(s.id)}
                    className="h-4 w-4 accent-rose-600"
                  />
                  <span className="font-medium text-zinc-800">{s.name}</span>
                </span>
                <span className="text-xs text-zinc-500">+{formatJpy(s.priceJpy)}／件</span>
              </label>
            ))}
          </div>
        </div>

        <h2 className="mt-6 text-lg font-bold text-zinc-900">国际运费</h2>
        {!initialShippingRates ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-700">
            运费数据暂时无法获取，请刷新页面重试，或直接联系客服报价
          </p>
        ) : (
          <>
            <div className="mt-4">
              <Label htmlFor="fc-weight" className="text-sm text-zinc-600">
                重量（g）
              </Label>
              <Input
                id="fc-weight"
                inputMode="numeric"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="1000"
                className="mt-1.5 h-11 text-base sm:max-w-xs"
              />
            </div>

            {/* 三线路同屏对比：最优标色，点卡切换（花哥 2026-08-09 拍板，与小程序费用试算页对齐） */}
            {methodQuotes.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {methodQuotes.map((q) => {
                  const selected = effectiveMethodCode === q.code;
                  const disabled = q.amountJpy == null;
                  const rmb =
                    q.amountJpy != null
                      ? round2(q.amountJpy * initialShippingRates.rate)
                      : null;
                  return (
                    <button
                      key={q.code}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setMethodCode(q.code);
                        setMethodPicked(true);
                      }}
                      className={[
                        "rounded-xl border-2 p-3.5 text-left transition",
                        disabled
                          ? "cursor-not-allowed border-zinc-100 bg-zinc-50 opacity-60"
                          : selected
                            ? "border-rose-500 bg-rose-50"
                            : q.isBest
                              ? "border-rose-300 bg-rose-50/50 hover:border-rose-400"
                              : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-semibold text-zinc-800">
                          {methodLabel({ code: q.code, name: q.name })}
                        </span>
                        {q.isBest && (
                          <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            ⚡ 综合最优
                          </span>
                        )}
                      </div>
                      {q.daysText && (
                        <p className="mt-0.5 text-xs text-zinc-400">约{q.daysText}天</p>
                      )}
                      {q.amountJpy != null ? (
                        <p className="mt-1.5 text-lg font-bold text-rose-600">
                          {formatJpy(q.amountJpy)}
                          {rmb != null && (
                            <span className="ml-1.5 text-xs font-normal text-zinc-400">
                              ≈{formatRmb(rmb)}
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="mt-1.5 text-xs text-amber-600">
                          超出该线路最大重量，请联系客服人工报价
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-zinc-50 px-4 py-4 text-center text-xs text-zinc-400">
                填写重量后显示三条线路的运费对比
              </p>
            )}

            <p className="mt-3 text-xs text-zinc-400">
              「综合最优」按运费与预计时效各占 50% 自动评分；时效为日本邮政参考区间。
              默认按发往中国大陆计算（含台湾/韩国同价）；实际运费以入仓称重结果为准。
            </p>

            <div className="mt-4">
              <p className="text-sm font-medium text-zinc-700">出库打包材料（按次）</p>
              <div className="mt-2 space-y-2">
                {shipServices.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm has-[:checked]:border-rose-300 has-[:checked]:bg-rose-50"
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedServiceIds.has(s.id)}
                        onChange={() => toggleService(s.id)}
                        className="h-4 w-4 accent-rose-600"
                      />
                      <span className="font-medium text-zinc-800">{s.name}</span>
                    </span>
                    <span className="text-xs text-zinc-500">+{formatJpy(s.priceJpy)}／次</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                实际以下单/出库时结算为准；箱子（中箱/大箱）通常二选一，由仓库按实际体积判定，勾选仅供估算。
              </p>
            </div>
          </>
        )}
      </div>

      {/* 结果区 */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-zinc-900">费用明细</h2>

        <div className="mt-4 space-y-2">
          {fee.status === "idle" && (
            <p className="rounded-xl bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-400">
              输入商品价格查看估算
            </p>
          )}
          {fee.status === "loading" && (
            <p className="rounded-xl bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-400">
              正在估算…
            </p>
          )}
          {(fee.status === "unavailable" || fee.status === "error") && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-700">
              暂时无法估算，请稍后再试或直接联系客服报价
            </p>
          )}
          {fee.status === "ok" && (
            <>
              <div className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm">
                <span className="text-zinc-500">商品款</span>
                <span className="font-medium text-zinc-800">{formatJpy(fee.data.priceJpy)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm">
                <span className="text-zinc-500">支付手续费</span>
                <span className="font-medium text-zinc-800">{formatJpy(fee.data.shopFeeJpy)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm">
                <span className="text-zinc-500">
                  代拍手续费
                  {fee.data.levelFeeJpy === 0 && (
                    <span className="ml-1.5 text-xs text-rose-500">现免</span>
                  )}
                </span>
                <span className="font-medium text-zinc-800">{formatJpy(fee.data.levelFeeJpy)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm">
                <span className="text-zinc-500">小计（商品+手续费，JPY）</span>
                <span className="font-medium text-zinc-800">{formatJpy(fee.data.amountJpy)}</span>
              </div>
            </>
          )}

          {initialShippingRates && weightGrams > 0 && (
            <div className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm">
              <span className="text-zinc-500">
                国际运费
                <span className="ml-1.5 text-xs text-zinc-400">
                  {effectiveMethodCode &&
                    methodLabel(
                      initialShippingRates.methods.find(
                        (m) => m.code === effectiveMethodCode,
                      )!,
                    )}
                </span>
              </span>
              {shippingJpy != null ? (
                <span className="text-right font-medium text-zinc-800">
                  {formatJpy(shippingJpy)}
                  {shippingRmb != null && (
                    <span className="ml-1.5 text-xs text-zinc-400">
                      ≈{formatRmb(shippingRmb)}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-xs text-amber-600">
                  {shippingMaxGrams != null
                    ? `超过 ${(shippingMaxGrams / 1000).toFixed(1)}kg，请联系客服人工报价`
                    : "查无此档位"}
                </span>
              )}
            </div>
          )}

          {valueAddedTotalJpy > 0 && (
            <div className="flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm">
              <span className="text-zinc-500">
                增值服务
                <span className="ml-1.5 text-xs text-zinc-400">
                  {selectedServices.map((s) => s.name).join("、")}
                </span>
              </span>
              <span className="font-medium text-zinc-800">{formatJpy(valueAddedTotalJpy)}</span>
            </div>
          )}
        </div>

        {/* 总计 */}
        <div className="mt-5 rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-rose-700">商品费 + 国际运费 + 增值服务 总计</span>
            {fee.status === "ok" && (
              <span className="text-xs text-rose-500">
                汇率取数 {formatRateAsOf(fee.data.rateAsOf)}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-2xl font-bold text-rose-600">
              {grandTotalJpy != null ? formatJpy(grandTotalJpy) : "—"}
            </span>
            <span className="text-lg font-bold text-rose-600">
              {grandTotalRmb != null ? `≈${formatRmb(grandTotalRmb)}` : ""}
            </span>
          </div>
          {grandTotalJpy == null && (
            <p className="mt-1 text-xs text-rose-400">
              {fee.status !== "ok"
                ? "先完成商品费估算"
                : weightGrams > 0 && shippingJpy == null
                  ? "运费超出可自动估算的重量范围，总计暂不可算"
                  : "再填写重量并选择运输方式即可看到总计"}
            </p>
          )}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-zinc-400">
          以上为预估值，不含清关税费——包裹入境后可能被海关另行征收关税，具体金额以海关实际征收为准。
          国际运费为日本邮政官方费率，实际以入仓称重结果为准；下单页/出库单实付以老后台结算为准（本页仅供参考）。
          {initialShippingRates && (
            <>
              运费汇率取数于 {formatRateAsOf(initialShippingRates.fetchedAt)}。
            </>
          )}
        </p>
      </div>

      <p className="text-center text-xs text-zinc-400">
        费率与服务价更新于 2026-08-06，实际以下单/出库时结算为准
      </p>

      <p className="text-center text-sm">
        <Link href="/fee-compare" className="font-medium text-rose-600 hover:text-rose-700">
          查看袋鼠君与同行的费用对比 →
        </Link>
      </p>
    </div>
  );
}
