"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { spaceGrotesk } from "@/app/fonts";

/**
 * 设计方向 A（深色高级感）的 en 购物车呈现层。
 *
 * 纯展示组件：增删数量 / 删除 / 留言保存 / 合计 / 去结算等业务逻辑仍在
 * cart/page.tsx 内，本组件只接收数据与回调，渲染成与新 TCG 外壳一致的深色界面
 * （bg-[#0a0e16] + cyan-400 + Space Grotesk）。仅在 locale === "en" 时使用，
 * 零影响其它语言。
 */

interface CartItemView {
  id: string;
  product: {
    id: string;
    title: string;
    coverImage: string | null;
    platform: string;
  };
  quantity: number;
  unitPriceJpy: number;
  subtotalCny: number;
  options: Record<string, unknown>;
  buyerMessage?: string;
}

interface SellerGroupView {
  seller: { id: string; name: string };
  items: CartItemView[];
  subtotal: number;
}

interface CartSummaryView {
  totalItems: number;
  subtotalJpy: number;
  subtotalCny: number;
  estimatedShippingCny: number;
  totalCny: number;
}

export interface TcgCartTexts {
  shoppingCart: string;
  clearAll: string;
  orderSummary: string;
  items: string;
  subtotalJpy: string;
  estimatedShipping: string;
  total: string;
  proceedToCheckout: string;
  shippingFinalized: string;
  unknownSeller: string;
  noImage: string;
  giftWrap: string;
  messageForSeller: string;
  save: string;
  remove: string;
  subtotal: string;
}

const PLATFORM_NAMES: Record<string, string> = {
  amazon: "Amazon",
  mercari: "Mercari",
  rakuten: "Rakuten",
  yahoo: "Yahoo",
};

function formatCny(amount: number): string {
  return `¥${Number(amount).toFixed(2)}`;
}

export function CartTcgView({
  texts,
  lang,
  groupedBySeller,
  summary,
  messages,
  updating,
  onMessageChange,
  onSaveMessage,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
}: {
  texts: TcgCartTexts;
  lang: string;
  groupedBySeller: SellerGroupView[];
  summary: CartSummaryView;
  messages: Record<string, string>;
  updating: string | null;
  onMessageChange: (itemId: string, value: string) => void;
  onSaveMessage: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
}) {
  return (
    <div
      className={`${spaceGrotesk.variable} min-h-screen bg-[#0a0e16] text-slate-200 antialiased`}
    >
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white md:text-3xl">
            {texts.shoppingCart}
          </h1>
          <button
            type="button"
            onClick={onClearCart}
            className="inline-flex h-9 items-center rounded-lg border border-white/12 bg-white/[0.03] px-3 text-sm font-medium text-slate-300 transition-colors hover:border-rose-400/40 hover:text-rose-300"
          >
            {texts.clearAll}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 商品列表 */}
          <div className="space-y-6 lg:col-span-2">
            {groupedBySeller.map((group) => (
              <section
                key={group.seller.id || "unknown"}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 shadow-2xl shadow-black/30"
              >
                <div className="mb-4 border-b border-white/10 pb-3 text-sm font-medium text-slate-200">
                  {group.seller.name || texts.unknownSeller}
                </div>

                <div className="space-y-5">
                  {group.items.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      {/* 商品图 */}
                      <Link
                        href={`/${lang}/products/${item.product.id}`}
                        className="shrink-0"
                      >
                        {item.product.coverImage ? (
                          <Image
                            src={item.product.coverImage}
                            alt={item.product.title}
                            width={80}
                            height={80}
                            unoptimized
                            className="h-20 w-20 rounded-xl border border-white/10 object-cover"
                          />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-white/10 bg-[#0e131d] text-xs text-slate-600">
                            {texts.noImage}
                          </div>
                        )}
                      </Link>

                      {/* 商品信息 */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/${lang}/products/${item.product.id}`}
                              className="line-clamp-2 text-sm font-medium leading-snug text-slate-100 transition-colors hover:text-cyan-300"
                            >
                              {item.product.title}
                            </Link>
                            <span className="mt-1.5 inline-flex items-center rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                              {PLATFORM_NAMES[item.product.platform] ||
                                item.product.platform}
                            </span>
                          </div>

                          {/* 数量增减 */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateQuantity(item.id, item.quantity - 1)
                              }
                              disabled={
                                updating === item.id || item.quantity <= 1
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/12 bg-white/[0.03] text-slate-200 transition-colors hover:border-cyan-400/40 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="-"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-sm text-slate-200">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateQuantity(item.id, item.quantity + 1)
                              }
                              disabled={
                                updating === item.id || item.quantity >= 5
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/12 bg-white/[0.03] text-slate-200 transition-colors hover:border-cyan-400/40 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="+"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* 选项（礼品包装） */}
                        {Boolean(
                          item.options &&
                            (item.options as { gift_wrap?: unknown }).gift_wrap,
                        ) && (
                          <div className="mt-1 text-xs text-slate-500">
                            {texts.giftWrap}
                          </div>
                        )}

                        {/* 留言 */}
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            placeholder={texts.messageForSeller}
                            value={messages[item.id] ?? item.buyerMessage ?? ""}
                            onChange={(e) =>
                              onMessageChange(item.id, e.target.value)
                            }
                            maxLength={200}
                            className="h-8 flex-1 rounded-lg border border-white/12 bg-white/[0.04] px-2.5 text-xs text-white placeholder:text-slate-500 outline-none transition-colors focus:border-cyan-400/50"
                          />
                          {messages[item.id] !== item.buyerMessage && (
                              <button
                                type="button"
                                onClick={() => onSaveMessage(item.id)}
                                disabled={updating === item.id}
                                className="inline-flex h-8 items-center rounded-lg border border-white/12 bg-white/[0.03] px-3 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-400/40 hover:text-cyan-200 disabled:opacity-40"
                              >
                                {texts.save}
                              </button>
                            )}
                        </div>

                        {/* 价格行 */}
                        <div className="mt-2 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.id)}
                            disabled={updating === item.id}
                            className="text-xs font-medium text-rose-400 transition-colors hover:text-rose-300 disabled:opacity-40"
                          >
                            {texts.remove}
                          </button>
                          <div className="text-sm">
                            <span className="mr-2 text-slate-500 line-through">
                              ¥{item.unitPriceJpy.toLocaleString("en-US")}
                            </span>
                            <span className="font-semibold text-cyan-300">
                              {formatCny(item.subtotalCny)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 卖家小计 */}
                <div className="mt-4 flex justify-end border-t border-white/10 pt-3 text-sm text-slate-300">
                  {texts.subtotal}:{" "}
                  <span className="ml-1 font-medium text-slate-100">
                    ¥{Math.round(group.subtotal).toLocaleString("en-US")}
                  </span>
                </div>
              </section>
            ))}
          </div>

          {/* 摘要 */}
          <div className="lg:col-span-1">
            <section className="sticky top-20 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 shadow-2xl shadow-black/30">
              <h2 className="font-[family-name:var(--font-display)] text-base font-bold tracking-tight text-white">
                {texts.orderSummary}
              </h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    {texts.items} ({summary.totalItems})
                  </span>
                  <span className="text-slate-200">
                    {formatCny(summary.subtotalCny)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{texts.subtotalJpy}</span>
                  <span className="text-slate-200">
                    ¥{Math.round(summary.subtotalJpy).toLocaleString("en-US")}
                  </span>
                </div>
                <div className="border-t border-white/10" />
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    {texts.estimatedShipping}
                  </span>
                  <span className="text-slate-200">
                    {formatCny(summary.estimatedShippingCny)}
                  </span>
                </div>
                <div className="border-t border-white/10" />
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-white">
                    {texts.total}
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-lg font-bold text-cyan-300">
                    {formatCny(summary.totalCny)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onCheckout}
                className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-cyan-400 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300"
              >
                {texts.proceedToCheckout}
              </button>

              <p className="mt-3 text-center text-xs text-slate-500">
                {texts.shippingFinalized}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CartTcgEmpty({
  lang,
  title,
  subtitle,
  browse,
}: {
  lang: string;
  title: string;
  subtitle: string;
  browse: string;
}) {
  return (
    <div
      className={`${spaceGrotesk.variable} min-h-screen bg-[#0a0e16] text-slate-200 antialiased`}
    >
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mb-4 text-5xl">🛒</div>
        <h1 className="mb-2 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white">
          {title}
        </h1>
        <p className="mb-8 text-sm text-slate-400">{subtitle}</p>
        <Link
          href={`/${lang}/products`}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-cyan-400 px-6 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300"
        >
          {browse}
        </Link>
      </div>
    </div>
  );
}

export function CartTcgLoading({ title }: { title: string }) {
  return (
    <div
      className={`${spaceGrotesk.variable} min-h-screen bg-[#0a0e16] text-slate-200 antialiased`}
    >
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-white/[0.06]" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
            />
          ))}
        </div>
        <span className="sr-only">{title}</span>
      </div>
    </div>
  );
}
