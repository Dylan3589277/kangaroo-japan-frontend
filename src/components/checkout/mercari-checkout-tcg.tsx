"use client";

import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { spaceGrotesk } from "@/app/fonts";

/**
 * 设计方向 A（深色高级感）的 en Mercari 结算呈现层。
 *
 * 纯展示组件：所有业务逻辑（getMercariQuote / proxy-submit / NewAge 二维码 /
 * 付款轮询 / 增值服务勾选 / 金额口径）仍在 mercari-checkout.tsx 内，本组件只接收
 * 计算好的值与回调，负责把它们渲染成与新 TCG 外壳一致的深色界面（bg-[#0a0e16]
 * + cyan-400 + Space Grotesk）。仅在 locale === "en" 时使用，零影响其它语言。
 */

interface MercariItemView {
  goods_name: string;
  imgurls?: string[];
}

interface ValueAddedView {
  id: number;
  name: string;
  priceJpy: number;
}

export interface TcgCheckoutTexts {
  title: string;
  sectionShipping: string;
  warehouseNotice: string;
  sectionItem: string;
  sectionValueAdded: string;
  noValueAdded: string;
  quoteFailed: string;
  buyerMessage: string;
  buyerMessagePlaceholder: string;
  summary: string;
  itemPrice: string;
  serviceFee: string;
  internationalShipping: string;
  internationalShippingNote: string;
  totalDue: string;
  fullPaymentNote: string;
  payNow: string;
  submitting: string;
  lockNote: string;
  soldOut: string;
  noImage: string;
  approx: string;
  usd: string;
}

const cardClass =
  "rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 shadow-2xl shadow-black/30";
const sectionTitleClass =
  "font-[family-name:var(--font-display)] text-base font-bold tracking-tight text-white";

function formatJpy(amount: number): string {
  return `¥${Math.round(amount).toLocaleString("en-US")}`;
}

function formatUsd(amount: number): string {
  return `$${Number(amount).toFixed(2)}`;
}

export function MercariCheckoutTcgView({
  texts,
  item,
  quoteError,
  isSoldOut,
  valueAdded,
  selectedValues,
  onToggleValue,
  valueAddedLabel,
  valueAddedDescription,
  buyerMessage,
  onBuyerMessageChange,
  displayPriceJpy,
  totalDueUsd,
  feeJpy,
  selectedVaList,
  totalDue,
  canSubmit,
  submitting,
  onSubmit,
}: {
  texts: TcgCheckoutTexts;
  item: MercariItemView;
  quoteError: string | null;
  isSoldOut: boolean;
  valueAdded: ValueAddedView[];
  selectedValues: Record<number, boolean>;
  onToggleValue: (id: number, checked: boolean) => void;
  valueAddedLabel: (va: ValueAddedView) => string;
  // 可选的增值服务说明（如高清特写拍照的一句话介绍）；无说明返回空串。
  valueAddedDescription?: (va: ValueAddedView) => string;
  buyerMessage: string;
  onBuyerMessageChange: (value: string) => void;
  displayPriceJpy: number;
  // 应付美元（含手续费 + 已勾选增值服务）= totalDue(JPY) × 后台 USD 汇率；汇率不可用为空。
  totalDueUsd?: number | null;
  feeJpy: number;
  selectedVaList: ValueAddedView[];
  totalDue: number;
  canSubmit: boolean;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <div
      className={`${spaceGrotesk.variable} min-h-screen bg-[#0a0e16] text-slate-200 antialiased`}
    >
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-8 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white md:text-3xl">
          {texts.title}
        </h1>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 左列：到仓说明 + 商品 + 增值服务 + 备注 */}
          <div className="space-y-6 lg:col-span-2">
            {/* 到仓说明 */}
            <section className={cardClass}>
              <h2 className={sectionTitleClass}>{texts.sectionShipping}</h2>
              <p className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-sm leading-relaxed text-slate-400">
                {texts.warehouseNotice}
              </p>
            </section>

            {/* 商品 */}
            <section className={cardClass}>
              <h2 className={sectionTitleClass}>{texts.sectionItem}</h2>
              <div className="mt-4 flex items-start gap-4">
                {item.imgurls && item.imgurls[0] ? (
                  <Image
                    src={item.imgurls[0]}
                    alt={item.goods_name}
                    width={72}
                    height={72}
                    unoptimized
                    className="h-18 w-18 shrink-0 rounded-xl border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#0e131d] text-xs text-slate-600">
                    {texts.noImage}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-100">
                    {item.goods_name}
                  </p>
                  <span className="mt-2 inline-flex items-center rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                    Mercari
                  </span>
                </div>
                <div className="shrink-0 whitespace-nowrap text-sm font-bold text-cyan-300">
                  {formatJpy(displayPriceJpy)}
                </div>
              </div>
              {isSoldOut && (
                <p className="mt-3 text-sm font-medium text-rose-400">
                  {texts.soldOut}
                </p>
              )}
            </section>

            {/* 增值服务 */}
            <section className={cardClass}>
              <h2 className={sectionTitleClass}>{texts.sectionValueAdded}</h2>
              <div className="mt-4 space-y-2">
                {valueAdded.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {quoteError ? texts.quoteFailed : texts.noValueAdded}
                  </p>
                ) : (
                  valueAdded.map((va) => {
                    const desc = valueAddedDescription?.(va) ?? "";
                    return (
                      <label
                        key={va.id}
                        className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm transition-colors hover:border-cyan-400/30"
                      >
                        <span className="flex items-start gap-3 text-slate-200">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 accent-cyan-400"
                            checked={!!selectedValues[va.id]}
                            onChange={(e) =>
                              onToggleValue(va.id, e.target.checked)
                            }
                          />
                          <span className="min-w-0">
                            <span className="block">{valueAddedLabel(va)}</span>
                            {desc ? (
                              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                                {desc}
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <span className="whitespace-nowrap text-slate-400">
                          {formatJpy(va.priceJpy)}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </section>

            {/* 备注 */}
            <section className={cardClass}>
              <h2 className={sectionTitleClass}>{texts.buyerMessage}</h2>
              <label htmlFor="tcgBuyerMessage" className="sr-only">
                {texts.buyerMessage}
              </label>
              <input
                id="tcgBuyerMessage"
                type="text"
                placeholder={texts.buyerMessagePlaceholder}
                value={buyerMessage}
                onChange={(e) => onBuyerMessageChange(e.target.value)}
                maxLength={200}
                className="mt-4 h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-cyan-400/50"
              />
            </section>
          </div>

          {/* 右列：费用明细 + 支付 */}
          <div className="lg:col-span-1">
            <section className={`${cardClass} sticky top-20`}>
              <h2 className={sectionTitleClass}>{texts.summary}</h2>

              {quoteError ? (
                <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
                  {quoteError}
                </div>
              ) : (
                <div className="mt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{texts.itemPrice}</span>
                    <span className="text-slate-200">
                      {formatJpy(displayPriceJpy)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{texts.serviceFee}</span>
                    <span className="text-slate-200">{formatJpy(feeJpy)}</span>
                  </div>
                  {selectedVaList.map((va) => (
                    <div
                      key={va.id}
                      className="flex justify-between text-slate-400"
                    >
                      <span className="truncate pr-2">
                        {valueAddedLabel(va)}
                      </span>
                      <span className="whitespace-nowrap">
                        {formatJpy(va.priceJpy)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-400">
                      {texts.internationalShipping}
                    </span>
                    <span className="text-right text-xs text-slate-500">
                      {texts.internationalShippingNote}
                    </span>
                  </div>

                  <div className="my-3 border-t border-white/10" />

                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold text-white">
                      {texts.totalDue}
                    </span>
                    <span className="font-[family-name:var(--font-display)] text-lg font-bold text-cyan-300">
                      {formatJpy(totalDue)}
                    </span>
                  </div>
                  {/* 应付美元（含手续费）：仅当后台 USD 汇率可用时显示，否则只显 JPY。 */}
                  {totalDueUsd !== undefined &&
                    totalDueUsd !== null &&
                    totalDueUsd > 0 && (
                      <div className="flex justify-end text-xs text-slate-500">
                        <span>
                          {texts.approx}
                          {formatUsd(totalDueUsd)}
                          {texts.usd}
                        </span>
                      </div>
                    )}
                </div>
              )}

              <p className="mt-4 text-xs leading-relaxed text-slate-500">
                {texts.fullPaymentNote}
              </p>

              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit}
                className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-xl bg-cyan-400 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? texts.submitting : texts.payNow}
              </button>

              <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
                {texts.lockNote}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface TcgPaymentTexts {
  paymentTitle: string;
  paymentAmount: string;
  paymentAmountUsd: string;
  scanToPayAlipay: string;
  scanToPay: string;
  qrAlt: string;
  openPaymentPage: string;
  paymentInProgress: string;
  paidGoToOrder: string;
  approx: string;
  usd: string;
}

export function MercariPaymentTcgView({
  texts,
  amount,
  amountUsd,
  qrcodeUrl,
  payUrl,
  onOpenPayUrl,
  onGoToOrder,
}: {
  texts: TcgPaymentTexts;
  amount: number;
  // 应付美元（含手续费）= amount(JPY) × 后台 USD 汇率；汇率不可用为空 → 只显 JPY。
  amountUsd?: number | null;
  qrcodeUrl?: string;
  payUrl?: string;
  onOpenPayUrl?: () => void;
  onGoToOrder: () => void;
}) {
  return (
    <div
      className={`${spaceGrotesk.variable} min-h-screen bg-[#0a0e16] text-slate-200 antialiased`}
    >
      <div className="mx-auto max-w-md px-4 py-12">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl shadow-black/30">
          <h1 className="text-center font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-white">
            {texts.paymentTitle}
          </h1>

          <div className="mt-5 flex items-center justify-between text-sm">
            <span className="text-slate-400">{texts.paymentAmount}</span>
            <span className="font-[family-name:var(--font-display)] text-lg font-bold text-cyan-300">
              {formatJpy(amount)}
            </span>
          </div>
          {amountUsd !== undefined && amountUsd !== null && amountUsd > 0 && (
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>{texts.paymentAmountUsd}</span>
              <span>
                {texts.approx}
                {formatUsd(amountUsd)}
                {texts.usd}
              </span>
            </div>
          )}

          <div className="my-5 border-t border-white/10" />

          {qrcodeUrl ? (
            <div className="flex flex-col items-center gap-3">
              {/* NewAge 收银二维码内容（非网址），渲染逻辑与默认版完全一致。 */}
              <div className="rounded-xl bg-white p-3">
                <QRCodeSVG
                  value={qrcodeUrl}
                  size={208}
                  level="M"
                  aria-label={texts.qrAlt}
                />
              </div>
              <p className="text-center text-sm font-medium text-slate-100">
                {texts.scanToPayAlipay}
              </p>
              <p className="text-center text-xs text-slate-500">
                {texts.scanToPay}
              </p>
            </div>
          ) : payUrl && onOpenPayUrl ? (
            <button
              type="button"
              onClick={onOpenPayUrl}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-cyan-400 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300"
            >
              {texts.openPaymentPage}
            </button>
          ) : null}

          <p className="mt-5 text-center text-xs text-slate-500">
            {texts.paymentInProgress}
          </p>
          <button
            type="button"
            onClick={onGoToOrder}
            className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/12 bg-white/[0.03] text-sm font-semibold text-slate-100 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
          >
            {texts.paidGoToOrder}
          </button>
        </section>
      </div>
    </div>
  );
}
