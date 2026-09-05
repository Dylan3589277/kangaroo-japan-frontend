"use client";

import { loginPathWithNext } from "@/lib/login-redirect";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

/**
 * zh 站「煤炉竞拍」代拍委托页：贴 Mercari 商品链接 + 出价上限 → 实时押金试算 → 提交委托；
 * 下方管理自己的委托（进行中/已中标/已结束）+ 取消。
 *
 * 后端 mercari-auction 模块目前只有 service 层，controller/DTO/module 接线尚未完成
 * （见 kangaroo-japan-backend/src/mercari-auction/mercari-auction.service.ts 顶部注释），
 * 本页严格按已定死的 API 契约实现，暂无法端到端联调，等后端接线上线后再核对一次。
 *
 * 金额铁律：JPY 一律整数（不除以100），CNY 一律两位小数。所有额度/费率数字
 * 均来自后端实时返回，不在前端写死（1元=200日元只是当前默认值，真实倍率
 * 以 /quota 返回的 rateJpyPerCny 为准）。
 */

// ── 同源 Next.js 路由代理老后台 PHP（/api/mercari-auction/...），与 api.ts 的
// 固定 /api/backend 基址分开，token 读取逻辑与 api.ts 的 getAccessToken 保持一致。
interface LegacyApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function getAccessTokenForLegacy(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("auth-storage");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.accessToken ?? null;
    }
  } catch {
    // ignore
  }
  return null;
}

async function callLegacyRoute<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<LegacyApiResponse<T>> {
  const token = getAccessTokenForLegacy();
  try {
    const res = await fetch(`/api/mercari-auction${path}`, {
      method: init?.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
    const data = await res.json().catch(() => null);
    if (res.status === 409 && data?.message === "NO_LEGACY_UID") {
      return { success: false, error: { code: "NO_LEGACY_UID", message: "NO_LEGACY_UID" } };
    }
    if (!res.ok) {
      return {
        success: false,
        error: { code: String(res.status), message: data?.message || "request_failed" },
      };
    }
    return { success: true, data: data as T };
  } catch {
    return { success: false, error: { code: "NETWORK", message: "network_error" } };
  }
}

// ── 类型（严格对齐已定死的 API 契约，字段名不与 yahoo/bids 等其它端点混用） ──

interface MercariAuctionQuota {
  requiredCny: number;
  balance: number;
  held: number;
  available: number;
  rateJpyPerCny: number;
  maxBidCapJpy: number;
  dailyCapJpy: number;
}

interface MercariAuctionBidSubmitSuccess {
  bidId: string;
  status: string;
  depositHoldCny: number;
  requiredCny: number;
}

// 软失败：后端 { code:1, errmsg, ... } 走 HTTP 200。注意 src/lib/api.ts 的
// parseResponse 只对 { code:0, data } 做特殊拆包；这种 { code:1, errmsg } 形状
// 会落进它的兜底分支，*res.success 仍是 true*，必须靠 res.data 里有没有
// errmsg 字段自己判断真假成功，不能只看 res.success（详见下方 isSubmitFailure）。
interface MercariAuctionBidSubmitFailure {
  errmsg: string;
  code?: string;
  required?: number;
  available?: number;
  dailyUsed?: number;
  dailyCap?: number;
}

type MercariAuctionBidSubmitResult =
  | MercariAuctionBidSubmitSuccess
  | MercariAuctionBidSubmitFailure;

function isSubmitFailure(
  payload: MercariAuctionBidSubmitResult,
): payload is MercariAuctionBidSubmitFailure {
  return "errmsg" in payload;
}

interface MercariAuctionCancelSuccess {
  depositReleased: boolean;
}

interface MercariAuctionCancelFailure {
  errmsg: string;
  code?: string;
}

type MercariAuctionCancelResult =
  | MercariAuctionCancelSuccess
  | MercariAuctionCancelFailure;

function isCancelFailure(
  payload: MercariAuctionCancelResult,
): payload is MercariAuctionCancelFailure {
  return "errmsg" in payload;
}

interface MercariAuctionBidListItem {
  id: string;
  item_id: string;
  item_title: string | null;
  item_url: string;
  max_bid_jpy: number;
  current_price_jpy: number | null;
  status: string;
  status_txt: string;
  end_time_text: string | null;
  deposit_hold_cny: number;
  created_at: string;
}

interface MercariAuctionBidListData {
  list: MercariAuctionBidListItem[];
  totalPages: number;
}

const TAB_CONFIG = [
  { value: "0", labelKey: "my.tabInProgress" },
  { value: "2", labelKey: "my.tabWon" },
  { value: "3", labelKey: "my.tabEnded" },
] as const;

// 只有这四种状态允许客户主动取消，必须与后端
// mercari-auction.service.ts 的 CANCELLABLE_BID_STATUSES 保持一致——
// 后端才是真正的闸门，这里只是不去展示一个点了必错的按钮。
const CANCELLABLE_STATUSES = new Set([
  "pending_deposit",
  "bidding",
  "leading",
  "outbid",
]);

// 金额一律 JPY 整数显示，不除以 100。
function formatJpy(amount: number): string {
  return `¥${Math.round(amount).toLocaleString()}`;
}

// 金额一律 CNY 两位小数显示。
function formatCny(amount: number): string {
  return `¥${Number(amount).toFixed(2)}`;
}

export default function MercariAuctionPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const t = useTranslations("mercariAuction");
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  // ── 提交块状态 ──
  const [itemUrl, setItemUrl] = useState("");
  const [itemUrlError, setItemUrlError] = useState<string | null>(null);
  const [maxBidInput, setMaxBidInput] = useState("");
  const [maxBidError, setMaxBidError] = useState<string | null>(null);

  const [quota, setQuota] = useState<MercariAuctionQuota | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── 我的委托块状态 ──
  const [tabValue, setTabValue] = useState("0");
  const [bids, setBids] = useState<MercariAuctionBidListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // ── 取消确认弹窗状态 ──
  const [cancelTarget, setCancelTarget] = useState<MercariAuctionBidListItem | null>(
    null,
  );
  const [cancelling, setCancelling] = useState(false);

  // 登录门禁：未登录跳登录页并带 next（与 bids/deposit 页一致）。
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(loginPathWithNext(lang));
    }
  }, [isAuthenticated, authLoading, lang, router]);

  // ── 实时押金试算：debounce 500ms 调 /quota ──
  useEffect(() => {
    const raw = maxBidInput.trim();
    if (!/^\d+$/.test(raw) || Number(raw) <= 0) {
      setQuota(null);
      setQuotaError(null);
      setQuotaLoading(false);
      return;
    }
    setQuotaLoading(true);
    setQuotaError(null);
    const money = Number(raw);
    const timer = window.setTimeout(() => {
      callLegacyRoute<MercariAuctionQuota>(`/quota?maxBidJpy=${money}`)
        .then((res) => {
          if (res.success && res.data) {
            setQuota(res.data);
          } else {
            setQuota(null);
            setQuotaError(
              res.error?.code === "NO_LEGACY_UID"
                ? t("submit.errors.noLegacyUid")
                : res.error?.message || t("submit.quotaFailed"),
            );
          }
        })
        .catch(() => {
          setQuota(null);
          setQuotaError(t("submit.errors.network"));
        })
        .finally(() => setQuotaLoading(false));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [maxBidInput, t]);

  // ── 我的委托列表拉取（同 bids/page.tsx 无限滚动模板） ──
  const fetchBids = useCallback(
    async (pageNum: number, append = false) => {
      if (!append) setListLoading(true);
      else setLoadingMore(true);

      try {
        const res = await callLegacyRoute<MercariAuctionBidListData>(
          `/bids?status=${tabValue}&page=${pageNum}`,
        );
        if (res.success && res.data) {
          const data = res.data;
          if (append) {
            setBids((prev) => [...prev, ...(data.list || [])]);
          } else {
            setBids(data.list || []);
          }
          setTotalPages(data.totalPages || 0);
        } else if (!append) {
          setBids([]);
        }
      } catch (error) {
        console.error("Failed to fetch mercari-auction bids:", error);
        if (!append) setBids([]);
      } finally {
        setListLoading(false);
        setLoadingMore(false);
      }
    },
    [tabValue],
  );

  useEffect(() => {
    if (isAuthenticated) {
      setPage(1);
      setBids([]);
      fetchBids(1);
    }
  }, [isAuthenticated, tabValue, fetchBids]);

  // 无限滚动 IntersectionObserver（同 bids/page.tsx）。
  useEffect(() => {
    if (listLoading || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && page < totalPages) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 },
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [listLoading, loadingMore, page, totalPages]);

  useEffect(() => {
    if (page > 1) {
      fetchBids(page, true);
    }
  }, [page, fetchBids]);

  const handleTabChange = (value: string) => {
    setTabValue(value);
    setPage(1);
    setBids([]);
  };

  // ── 提交委托 ──
  const validateItemUrl = (): boolean => {
    const raw = itemUrl.trim();
    if (!raw) {
      setItemUrlError(t("submit.errors.itemUrlRequired"));
      return false;
    }
    if (!/^https?:\/\//i.test(raw)) {
      setItemUrlError(t("submit.errors.itemUrlInvalid"));
      return false;
    }
    setItemUrlError(null);
    return true;
  };

  const validateMaxBid = (): number | null => {
    const raw = maxBidInput.trim();
    if (!raw) {
      setMaxBidError(t("submit.errors.maxBidRequired"));
      return null;
    }
    if (!/^\d+$/.test(raw) || Number(raw) <= 0) {
      setMaxBidError(t("submit.errors.maxBidInvalid"));
      return null;
    }
    setMaxBidError(null);
    return Number(raw);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const urlOk = validateItemUrl();
    const money = validateMaxBid();
    if (!urlOk || money === null) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await callLegacyRoute<MercariAuctionBidSubmitResult>("/bid", {
        method: "POST",
        body: { itemUrl: itemUrl.trim(), maxBidJpy: money },
      });

      // 见文件顶部注释：res.success 在软失败下也可能是 true，必须用
      // payload 里有没有 errmsg 字段来判定，不能只看 res.success。
      const payload = res.data;

      if (res.success && payload && !isSubmitFailure(payload)) {
        toast.success(t("submit.submitSuccess"));
        setItemUrl("");
        setMaxBidInput("");
        setQuota(null);
        // 新委托默认落「进行中」，若当前就在该 tab 则刷新列表让它立刻可见。
        if (tabValue === "0") {
          setPage(1);
          fetchBids(1);
        }
        return;
      }

      if (payload && isSubmitFailure(payload)) {
        let msg = payload.errmsg || t("submit.errors.generic");
        if (
          payload.code === "insufficient_deposit" &&
          payload.required !== undefined &&
          payload.available !== undefined
        ) {
          msg += t("submit.errors.insufficientDepositSuffix", {
            required: formatCny(payload.required),
            available: formatCny(payload.available),
          });
        } else if (
          payload.code === "daily_cap_exceeded" &&
          payload.dailyUsed !== undefined &&
          payload.dailyCap !== undefined
        ) {
          msg += t("submit.errors.dailyCapSuffix", {
            dailyUsed: formatJpy(payload.dailyUsed),
            dailyCap: formatJpy(payload.dailyCap),
          });
        }
        setSubmitError(msg);
        return;
      }

      setSubmitError(
        res.error?.code === "NO_LEGACY_UID"
          ? t("submit.errors.noLegacyUid")
          : res.error?.message || t("submit.errors.generic"),
      );
    } catch (error) {
      console.error("Failed to submit mercari-auction bid:", error);
      setSubmitError(t("submit.errors.network"));
    } finally {
      setSubmitting(false);
    }
  };

  // ── 取消委托 ──
  const handleCancelConfirm = async () => {
    if (!cancelTarget || cancelling) return;
    setCancelling(true);
    try {
      const res = await callLegacyRoute<MercariAuctionCancelResult>(
        `/bid/${cancelTarget.id}/cancel`,
        { method: "POST" },
      );
      const payload = res.data;

      if (res.success && payload && !isCancelFailure(payload)) {
        // 🔴文案铁律：绝不能让客户误以为押金马上回来——按 depositReleased 分流。
        toast.success(
          payload.depositReleased
            ? t("my.cancelSuccessReleased")
            : t("my.cancelSuccessHeld"),
        );
        setCancelTarget(null);
        setPage(1);
        fetchBids(1);
        return;
      }

      const errMsg = payload && isCancelFailure(payload) ? payload.errmsg : undefined;
      toast.error(
        errMsg ||
          (res.error?.code === "NO_LEGACY_UID"
            ? t("submit.errors.noLegacyUid")
            : res.error?.message) ||
          t("my.cancelFailed"),
      );
    } catch (error) {
      console.error("Failed to cancel mercari-auction bid:", error);
      toast.error(t("my.cancelFailed"));
    } finally {
      setCancelling(false);
    }
  };

  if (!authLoading && !isAuthenticated) {
    return null;
  }

  const canSubmit = !submitting;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">{t("title")}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t("subtitle")}</p>

      {/* 提交块 */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("submit.heading")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="mercariAuctionItemUrl" className="mb-1.5">
              {t("submit.itemUrlLabel")}
            </Label>
            <Input
              id="mercariAuctionItemUrl"
              type="text"
              autoComplete="off"
              value={itemUrl}
              onChange={(e) => {
                setItemUrl(e.target.value);
                if (itemUrlError) setItemUrlError(null);
              }}
              placeholder={t("submit.itemUrlPlaceholder")}
              aria-invalid={!!itemUrlError}
            />
            {itemUrlError && (
              <p className="mt-1.5 text-xs text-red-600">{itemUrlError}</p>
            )}
          </div>

          <div>
            <Label htmlFor="mercariAuctionMaxBid" className="mb-1.5">
              {t("submit.maxBidLabel")}
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                JPY
              </span>
              <Input
                id="mercariAuctionMaxBid"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={maxBidInput}
                onChange={(e) => {
                  setMaxBidInput(e.target.value.replace(/[^\d]/g, ""));
                  if (maxBidError) setMaxBidError(null);
                }}
                placeholder={t("submit.maxBidPlaceholder")}
                aria-invalid={!!maxBidError}
                className="pl-11"
              />
            </div>
            {maxBidError && (
              <p className="mt-1.5 text-xs text-red-600">{maxBidError}</p>
            )}
          </div>

          {/* 押金试算面板 */}
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            {quotaLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t("submit.quotaLoading")}
              </div>
            ) : quotaError ? (
              <p className="text-red-600">{quotaError}</p>
            ) : quota ? (
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("submit.quotaRequired")}
                  </span>
                  <span className="font-semibold">
                    {formatCny(quota.requiredCny)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("submit.quotaAvailable")}
                  </span>
                  <span
                    className={
                      quota.available < quota.requiredCny
                        ? "font-semibold text-red-600"
                        : "font-semibold"
                    }
                  >
                    {formatCny(quota.available)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("submit.quotaRateNote", { rate: quota.rateJpyPerCny })}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">{t("submit.quotaHint")}</p>
            )}
          </div>

          {submitError && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30">
              {submitError}
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
          >
            {submitting ? t("submit.submitting") : t("submit.submitButton")}
          </Button>
        </CardContent>
      </Card>

      {/* 我的委托块 */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("my.heading")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={tabValue} onValueChange={handleTabChange} className="mb-4">
            <TabsList className="flex flex-wrap h-auto gap-1">
              {TAB_CONFIG.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {t(tab.labelKey)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {listLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg border p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : bids.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">🔨</div>
              <h3 className="font-medium mb-1">{t("my.empty")}</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {t("my.emptySubtitle")}
              </p>
              <Link href={`/${lang}/mercari`}>
                <Button variant="outline">{t("my.browseButton")}</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bids.map((bid) => {
                const cancellable = CANCELLABLE_STATUSES.has(bid.status);
                return (
                  <div key={bid.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <a
                        href={bid.item_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium line-clamp-2 hover:underline"
                      >
                        {bid.item_title || bid.item_id || t("my.untitledItem")}
                      </a>
                      <Badge variant="secondary" className="shrink-0">
                        {bid.status_txt || bid.status}
                      </Badge>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {t("my.maxBid")}: {formatJpy(bid.max_bid_jpy)}
                      </span>
                      {bid.current_price_jpy !== null && (
                        <span>
                          {t("my.currentPrice")}: {formatJpy(bid.current_price_jpy)}
                        </span>
                      )}
                      <span>
                        {t("my.depositHold")}: {formatCny(bid.deposit_hold_cny)}
                      </span>
                      {bid.end_time_text && (
                        <span>
                          {t("my.endTime")}: {bid.end_time_text}
                        </span>
                      )}
                      <span>
                        {t("my.createdAt")}: {new Date(bid.created_at).toLocaleString()}
                      </span>
                    </div>

                    {cancellable && (
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCancelTarget(bid)}
                        >
                          {t("my.cancelButton")}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

              <div ref={sentinelRef} className="h-4" />

              {loadingMore && (
                <div className="text-center py-4">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}

              {!loadingMore && page >= totalPages && bids.length > 0 && (
                <p className="text-center text-xs text-muted-foreground py-4">
                  {t("my.noMore")}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 规则说明（静态文案） */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("rules.heading")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {[
              "rules.irrevocable",
              // 煤炉明标直出机制（花哥 2026-08-09 要求提前明示）：出价金额直接
              // 成为当前价格，与雅虎代理出价完全不同——不写清客户会按雅虎的
              // 直觉设上限，实际被抬价时必然投诉。
              "rules.bidDirectPrice",
              "rules.endTimeMayChange",
              "rules.payWithin24h",
              // 违约条款（花哥 2026-08-08 拍板）：逾期未付 → 押金没收、货归本站。
              // 没收押金必须事先明示，这行是没收的契约依据，不许删。
              "rules.forfeitOnDefault",
              "rules.depositFormula",
              "rules.depositShared",
              "rules.priceWins",
            ].map((key) => (
              <li key={key} className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* 取消确认弹窗：必须写清两种可能的押金结果，绝不让客户误以为押金马上回来 */}
      <Dialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open && !cancelling) setCancelTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("my.cancelConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{t("my.cancelConfirmNotBidYet")}</p>
            <p>{t("my.cancelConfirmAlreadyBid")}</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelTarget(null)}
              disabled={cancelling}
            >
              {t("my.cancelConfirmKeep")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleCancelConfirm()}
              disabled={cancelling}
            >
              {cancelling ? t("my.cancelling") : t("my.cancelConfirmOk")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
