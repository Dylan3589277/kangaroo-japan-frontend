"use client";

import Image from "next/image";
import Link from "next/link";
import { spaceGrotesk } from "@/app/fonts";

/**
 * 设计方向 A（深色高级感）的 en 我的订单（列表 + 详情）呈现层。
 *
 * 纯展示组件：订单取数、状态过滤、分页、取消、轮询(?poll=1)、状态提示条、追踪
 * 包裹等业务逻辑仍在 orders/page.tsx 与 orders/[id]/page.tsx 内，本组件只接收
 * 计算好的数据与回调，渲染成与新 TCG 外壳一致的深色界面（bg-[#0a0e16] +
 * cyan-400 + Space Grotesk）。仅在 locale === "en" 时使用，零影响其它语言。
 */

const shellClass = `min-h-screen bg-[#0a0e16] text-slate-200 antialiased`;
const cardClass =
  "rounded-2xl border border-white/[0.08] bg-white/[0.03] shadow-2xl shadow-black/30";
const sectionTitleClass =
  "font-[family-name:var(--font-display)] text-base font-bold tracking-tight text-white";

// 深色徽章配色：每个状态一个柔光底 + 描边 + 文字色，区别于其它语言用的实心 bg-*-500。
const STATUS_BADGE_CLASSES: Record<string, string> = {
  pending: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  paid: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  processing: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  purchased: "border-indigo-400/30 bg-indigo-400/10 text-indigo-300",
  shipped: "border-orange-400/30 bg-orange-400/10 text-orange-300",
  in_transit: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  delivered: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  cancelled: "border-white/15 bg-white/[0.04] text-slate-400",
  refunded: "border-pink-400/30 bg-pink-400/10 text-pink-300",
};

const PLATFORM_NAMES: Record<string, string> = {
  amazon: "Amazon",
  mercari: "Mercari",
  rakuten: "Rakuten",
  yahoo: "Yahoo",
};

function StatusBadge({
  status,
  label,
  size = "sm",
}: {
  status: string;
  label: string;
  size?: "sm" | "md";
}) {
  const tone =
    STATUS_BADGE_CLASSES[status] || "border-white/15 bg-white/[0.04] text-slate-400";
  const sizing = size === "md" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${tone} ${sizing}`}
    >
      {label}
    </span>
  );
}

function PlatformTag({ platform }: { platform: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
      {PLATFORM_NAMES[platform] || platform}
    </span>
  );
}

// ──────────────────────────────── 订单列表 ────────────────────────────────

interface OrderItemView {
  id: string;
  title: string;
  cover_image: string | null;
  platform: string;
  quantity: number;
  subtotal_jpy: number;
  subtotal_cny: number;
}

interface OrderListItem {
  id: string;
  order_no: string;
  status: string;
  total_amount: number;
  total_currency: string;
  items_count: number;
  tracking_number: string | null;
  created_at: string;
  items: OrderItemView[];
}

export interface TcgOrdersListTexts {
  title: string;
  emptyTitle: string;
  emptySubtitle: string;
  browseProducts: string;
  noImage: string;
  moreItems: string; // "{n} more items" — pass with {n} placeholder
  trackingLabel: string;
  viewDetails: string;
  cancel: string;
  previous: string;
  next: string;
  pageOf: string; // "Page {page} of {total}" — pass with placeholders
}

export function OrdersTcgList({
  texts,
  lang,
  orders,
  statusTabs,
  statusFilter,
  onStatusChange,
  page,
  totalPages,
  onPrevPage,
  onNextPage,
  loading,
  getStatusLabel,
  formatCurrency,
  onCancelOrder,
}: {
  texts: TcgOrdersListTexts;
  lang: string;
  orders: OrderListItem[];
  statusTabs: { value: string; label: string }[];
  statusFilter: string;
  onStatusChange: (value: string) => void;
  page: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  loading: boolean;
  getStatusLabel: (status: string) => string;
  formatCurrency: (amount: number, currency: string) => string;
  onCancelOrder: (orderId: string) => void;
}) {
  return (
    <div className={`${spaceGrotesk.variable} ${shellClass}`}>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="mb-7 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white md:text-3xl">
          {texts.title}
        </h1>

        {/* 状态过滤 tabs */}
        <div className="mb-7 flex flex-wrap gap-2">
          {statusTabs.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onStatusChange(tab.value)}
                className={`inline-flex h-9 items-center rounded-lg border px-3.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200"
                    : "border-white/12 bg-white/[0.03] text-slate-400 hover:border-cyan-400/30 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center">
            <div className="mb-4 text-5xl">📦</div>
            <h2 className="mb-2 font-[family-name:var(--font-display)] text-xl font-bold text-white">
              {texts.emptyTitle}
            </h2>
            <p className="mb-8 text-sm text-slate-400">{texts.emptySubtitle}</p>
            <Link
              href={`/${lang}/products`}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-cyan-400 px-6 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300"
            >
              {texts.browseProducts}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <section key={order.id} className={`overflow-hidden ${cardClass}`}>
                {/* 头部：单号 + 状态 + 日期 */}
                <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-slate-300">
                      {order.order_no}
                    </span>
                    <StatusBadge
                      status={order.status}
                      label={getStatusLabel(order.status)}
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* 商品预览（最多 3 个） */}
                <div className="px-5 py-4">
                  <div className="space-y-1">
                    {(order.items || []).slice(0, 3).map((item) => (
                      <Link
                        key={item.id}
                        href={`/${lang}/orders/${order.id}`}
                        className="-mx-2 flex gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.03]"
                      >
                        {item.cover_image ? (
                          <Image
                            src={item.cover_image}
                            alt={item.title}
                            width={48}
                            height={48}
                            unoptimized
                            className="h-12 w-12 rounded-lg border border-white/10 object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-[#0e131d] text-[10px] text-slate-600">
                            {texts.noImage}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-1 text-sm font-medium text-slate-100">
                            {item.title}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <PlatformTag platform={item.platform} />
                            <span className="text-xs text-slate-500">
                              x{item.quantity}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-sm text-slate-300">
                          {formatCurrency(
                            order.total_currency === "JPY"
                              ? item.subtotal_jpy
                              : item.subtotal_cny,
                            order.total_currency,
                          )}
                        </div>
                      </Link>
                    ))}

                    {order.items_count > 3 && (
                      <div className="py-1 text-center text-xs text-slate-500">
                        {texts.moreItems.replace(
                          "{n}",
                          String(order.items_count - 3),
                        )}
                      </div>
                    )}
                  </div>

                  {/* 底部：合计 + 操作 */}
                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-cyan-300">
                        {formatCurrency(order.total_amount, order.total_currency)}
                      </span>
                      {order.tracking_number && (
                        <span className="text-xs text-slate-500">
                          {texts.trackingLabel}: {order.tracking_number}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/${lang}/orders/${order.id}`}
                        className="inline-flex h-8 items-center rounded-lg border border-white/12 bg-white/[0.03] px-3 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
                      >
                        {texts.viewDetails}
                      </Link>
                      {order.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => onCancelOrder(order.id)}
                          className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium text-rose-400 transition-colors hover:text-rose-300"
                        >
                          {texts.cancel}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            ))}

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={onPrevPage}
                  className="inline-flex h-9 items-center rounded-lg border border-white/12 bg-white/[0.03] px-3.5 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-400/40 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {texts.previous}
                </button>
                <span className="text-sm text-slate-500">
                  {texts.pageOf
                    .replace("{page}", String(page))
                    .replace("{total}", String(totalPages))}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={onNextPage}
                  className="inline-flex h-9 items-center rounded-lg border border-white/12 bg-white/[0.03] px-3.5 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-400/40 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {texts.next}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function OrdersTcgLoading({ title }: { title: string }) {
  return (
    <div className={`${spaceGrotesk.variable} ${shellClass}`}>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-7 h-8 w-48 animate-pulse rounded bg-white/[0.06]" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
            />
          ))}
        </div>
        <span className="sr-only">{title}</span>
      </div>
    </div>
  );
}

// ──────────────────────────────── 订单详情 ────────────────────────────────

interface DetailItemView {
  id: string;
  title: string;
  cover_image: string | null;
  platform: string;
  quantity: number;
  subtotal_jpy: number;
  subtotal_cny: number;
  seller_name: string;
}

interface DetailOrderView {
  order_no: string;
  status: string;
  total_amount: number;
  total_currency: string;
  subtotal_jpy: number;
  subtotal_cny: number;
  subtotal_usd: number;
  shipping_fee_jpy: number;
  shipping_fee_cny: number;
  service_fee_jpy: number;
  service_fee_cny: number;
  coupon_discount_cny: number;
  payment_method: string | null;
  paid_at: string | null;
  tracking_number: string | null;
  shipping_carrier: string | null;
  shipped_at: string | null;
  estimated_delivery: string | null;
  created_at: string;
  buyer_message: string | null;
  items: DetailItemView[];
  address: {
    recipient_name: string;
    phone: string;
    country_name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    postal_code: string;
  } | null;
}

export interface TcgOrderDetailTexts {
  back: string;
  orderTitle: string; // "Order {no}" — pass with {no}
  placedOn: string; // "Placed on {date}" — pass with {date}
  trackPackage: string;
  cancelOrder: string;
  cancelling: string;
  pollingTitle: string;
  refresh: string;
  itemsTitle: string; // "Items ({n})" — pass with {n}
  noImage: string;
  shippingAddress: string;
  logistics: string;
  carrier: string;
  trackingNumber: string;
  shippedAt: string;
  estDelivery: string;
  yourMessage: string;
  paymentSummary: string;
  subtotal: string;
  shipping: string;
  serviceFee: string;
  couponDiscount: string;
  total: string;
  paidOn: string; // "Paid on {date}" — pass with {date}
  paymentMethod: string;
  notFoundTitle: string;
  backToOrders: string;
}

export function OrderDetailTcgNotFound({
  texts,
  lang,
}: {
  texts: Pick<TcgOrderDetailTexts, "notFoundTitle" | "backToOrders">;
  lang: string;
}) {
  return (
    <div className={`${spaceGrotesk.variable} ${shellClass}`}>
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mb-4 text-5xl">📦</div>
        <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-bold text-white">
          {texts.notFoundTitle}
        </h1>
        <Link
          href={`/${lang}/orders`}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-white/12 bg-white/[0.03] px-6 text-sm font-semibold text-slate-100 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
        >
          {texts.backToOrders}
        </Link>
      </div>
    </div>
  );
}

export function OrderDetailTcgLoading() {
  return (
    <div className={`${spaceGrotesk.variable} ${shellClass}`}>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-40 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
      </div>
    </div>
  );
}

export function OrderDetailTcgView({
  texts,
  lang,
  order,
  cancelling,
  showPollingBanner,
  pollingStatusHint,
  getStatusLabel,
  formatCurrency,
  onTrack,
  onCancel,
  onRefresh,
}: {
  texts: TcgOrderDetailTexts;
  lang: string;
  order: DetailOrderView;
  cancelling: boolean;
  showPollingBanner: boolean;
  pollingStatusHint: string;
  getStatusLabel: (status: string) => string;
  formatCurrency: (amount: number, currency: string) => string;
  onTrack: () => void;
  onCancel: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className={`${spaceGrotesk.variable} ${shellClass}`}>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link
          href={`/${lang}/orders`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-cyan-300"
        >
          ← {texts.back}
        </Link>

        <h1 className="mb-6 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white">
          {texts.orderTitle.replace("{no}", order.order_no)}
        </h1>

        {/* 状态横幅 */}
        <section className={`mb-6 ${cardClass} p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge
                status={order.status}
                label={getStatusLabel(order.status)}
                size="md"
              />
              <span className="text-sm text-slate-500">
                {texts.placedOn.replace(
                  "{date}",
                  new Date(order.created_at).toLocaleDateString(),
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {order.tracking_number && (
                <button
                  type="button"
                  onClick={onTrack}
                  className="inline-flex h-9 items-center rounded-lg border border-white/12 bg-white/[0.03] px-3.5 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
                >
                  {texts.trackPackage}
                </button>
              )}
              {order.status === "pending" && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={cancelling}
                  className="inline-flex h-9 items-center rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
                >
                  {cancelling ? texts.cancelling : texts.cancelOrder}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* 付款后回单轮询提示条（?poll=1 进入且非终态时显示，逻辑由页面控制） */}
        {showPollingBanner && (
          <section className="mb-6 rounded-2xl border border-cyan-400/30 bg-cyan-400/[0.07] p-4 shadow-2xl shadow-black/20">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-cyan-400" />
                <div>
                  <div className="text-sm font-medium text-cyan-100">
                    {texts.pollingTitle}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {pollingStatusHint}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex h-9 shrink-0 items-center rounded-lg border border-white/12 bg-white/[0.04] px-3.5 text-sm font-medium text-slate-100 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
              >
                {texts.refresh}
              </button>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 主内容 */}
          <div className="space-y-6 lg:col-span-2">
            {/* 商品 */}
            <section className={`${cardClass} p-5`}>
              <h2 className={sectionTitleClass}>
                {texts.itemsTitle.replace(
                  "{n}",
                  String(order.items?.length || 0),
                )}
              </h2>
              <div className="mt-4 space-y-4">
                {(order.items || []).map((item) => (
                  <div key={item.id} className="flex gap-4">
                    {item.cover_image ? (
                      <Image
                        src={item.cover_image}
                        alt={item.title}
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
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-medium text-slate-100">
                        {item.title}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <PlatformTag platform={item.platform} />
                        {item.seller_name && (
                          <span className="text-xs text-slate-500">
                            {item.seller_name}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          x{item.quantity}
                        </span>
                        <span className="text-sm font-medium text-slate-200">
                          {formatCurrency(
                            order.total_currency === "JPY"
                              ? item.subtotal_jpy
                              : item.subtotal_cny,
                            order.total_currency,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 收货地址 */}
            {order.address && (
              <section className={`${cardClass} p-5`}>
                <h2 className={sectionTitleClass}>{texts.shippingAddress}</h2>
                <div className="mt-3 text-sm">
                  <div className="font-medium text-slate-100">
                    {order.address.recipient_name}
                  </div>
                  <div className="mt-1 text-slate-400">{order.address.phone}</div>
                  <div className="mt-1 text-slate-400">
                    {order.address.country_name}
                  </div>
                  <div className="text-slate-400">
                    {order.address.city} {order.address.address_line1}
                    {order.address.address_line2 &&
                      `, ${order.address.address_line2}`}
                  </div>
                  <div className="text-slate-400">{order.address.postal_code}</div>
                </div>
              </section>
            )}

            {/* 物流 */}
            {order.tracking_number && (
              <section className={`${cardClass} p-5`}>
                <h2 className={sectionTitleClass}>{texts.logistics}</h2>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{texts.carrier}</span>
                    <span className="text-slate-200">
                      {order.shipping_carrier || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{texts.trackingNumber}</span>
                    <span className="font-mono text-xs text-slate-200">
                      {order.tracking_number}
                    </span>
                  </div>
                  {order.shipped_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">{texts.shippedAt}</span>
                      <span className="text-slate-200">
                        {new Date(order.shipped_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {order.estimated_delivery && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">{texts.estDelivery}</span>
                      <span className="text-slate-200">
                        {new Date(order.estimated_delivery).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 买家留言 */}
            {order.buyer_message && (
              <section className={`${cardClass} p-5`}>
                <h2 className={sectionTitleClass}>{texts.yourMessage}</h2>
                <p className="mt-3 text-sm text-slate-400">
                  {order.buyer_message}
                </p>
              </section>
            )}
          </div>

          {/* 侧栏：费用明细 */}
          <div className="lg:col-span-1">
            <section className={`${cardClass} sticky top-20 p-5`}>
              <h2 className={sectionTitleClass}>{texts.paymentSummary}</h2>
              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">{texts.subtotal}</span>
                  <span className="text-slate-200">
                    {formatCurrency(
                      order.total_currency === "JPY"
                        ? order.subtotal_jpy
                        : order.total_currency === "USD"
                          ? order.subtotal_usd
                          : order.subtotal_cny,
                      order.total_currency,
                    )}
                  </span>
                </div>
                {order.total_currency === "CNY" && order.subtotal_jpy > 0 && (
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>(JPY)</span>
                    <span>
                      ¥{Math.round(order.subtotal_jpy).toLocaleString("en-US")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">{texts.shipping}</span>
                  <span className="text-slate-200">
                    {formatCurrency(
                      order.total_currency === "JPY"
                        ? order.shipping_fee_jpy
                        : order.shipping_fee_cny,
                      order.total_currency,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{texts.serviceFee}</span>
                  <span className="text-slate-200">
                    {formatCurrency(
                      order.total_currency === "JPY"
                        ? order.service_fee_jpy
                        : order.service_fee_cny,
                      order.total_currency,
                    )}
                  </span>
                </div>
                {order.coupon_discount_cny > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>{texts.couponDiscount}</span>
                    <span>-¥{order.coupon_discount_cny.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="my-3 border-t border-white/10" />

              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-white">{texts.total}</span>
                <span className="font-[family-name:var(--font-display)] text-lg font-bold text-cyan-300">
                  {formatCurrency(order.total_amount, order.total_currency)}
                </span>
              </div>

              {order.paid_at && (
                <div className="mt-3 text-center text-xs text-slate-500">
                  {texts.paidOn.replace(
                    "{date}",
                    new Date(order.paid_at).toLocaleString(),
                  )}
                </div>
              )}

              {order.payment_method && (
                <div className="mt-3">
                  <div className="mb-1 text-xs text-slate-500">
                    {texts.paymentMethod}
                  </div>
                  <div className="text-sm font-medium capitalize text-slate-200">
                    {order.payment_method.replace(/_/g, " ")}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
