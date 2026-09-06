"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { CANDY_THEME_CSS } from "../../../candy-theme";

// 竞拍中/领先/被超才能加价，其余状态（待押金/已中标/已结束等）不可加价。
const RAISABLE_STATUSES = new Set([1, 2, 3]);

type BidRecord = {
  id?: number | string;
  status?: number;
  status_txt?: string;
  goods_no?: string;
  goods_url?: string;
  goods_name?: string;
  goods_image?: string;
  max_bid_jpy?: number;
  deposit_hold_cny?: number;
  create_time?: string;
};

function getRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function formatCny(value: number | string | undefined): string {
  const n = Number(value ?? 0);
  return `¥${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

function formatJpy(value: number | undefined): string {
  const n = Number(value ?? 0);
  return `¥${(Number.isFinite(n) ? n : 0).toLocaleString("ja-JP")}`;
}

export default function SupportAuctionMercariDetailPage() {
  const params = useParams<{ lang?: string; id?: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = params?.lang || "zh";
  const itemId = params?.id || "";
  const userId = searchParams.get("user_id") || "";
  const ts = searchParams.get("ts") || "";
  const sig = searchParams.get("sig") || "";
  const isCandyTheme = searchParams.get("theme") === "candy";

  const originalQuery = useMemo(() => {
    const qs = new URLSearchParams();
    if (userId) qs.set("user_id", userId);
    if (ts) qs.set("ts", ts);
    if (sig) qs.set("sig", sig);
    if (isCandyTheme) qs.set("theme", "candy");
    return qs.toString();
  }, [userId, ts, sig, isCandyTheme]);

  const [record, setRecord] = useState<BidRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [raiseInput, setRaiseInput] = useState("");
  const [raising, setRaising] = useState(false);
  const [raiseError, setRaiseError] = useState("");
  const [raiseInited, setRaiseInited] = useState(false);

  const signBody = useCallback(
    (extra: Record<string, unknown>) => ({
      user_id: userId,
      ts,
      sig,
      ...extra,
    }),
    [userId, ts, sig],
  );

  // 没有单条查询接口，从列表里按 id 找。三个状态桶都翻一遍，命中就停。
  const loadRecord = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      for (const bucket of [0, 2, 3]) {
        const res = await fetch("/api/support/mercari/bids", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(signBody({ bucket, page: 1 })),
        });
        const payload = await res.json().catch(() => null);
        const root = getRecord(payload);
        if (root.code === 101) {
          setLoadError("请从客服对话重新进入");
          setLoading(false);
          return;
        }
        if (root.code !== 0) continue;
        const data = getRecord(root.data);
        const list = Array.isArray(data.list) ? (data.list as Record<string, unknown>[]) : [];
        const hit = list.find((raw) => String(raw.id) === String(itemId));
        if (hit) {
          setRecord(hit as BidRecord);
          setLoading(false);
          return;
        }
      }
      setLoadError("未找到该委托");
    } catch {
      setLoadError("网络异常，请重试");
    } finally {
      setLoading(false);
    }
  }, [itemId, signBody]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  useEffect(() => {
    if (raiseInited || !record) return;
    const oldMax = Number(record.max_bid_jpy ?? 0);
    setRaiseInput(String(oldMax + 100));
    setRaiseInited(true);
  }, [record, raiseInited]);

  const canRaise = record ? RAISABLE_STATUSES.has(Number(record.status)) : false;

  async function submitRaise() {
    if (!record) return;
    const oldMax = Number(record.max_bid_jpy ?? 0);
    const amount = Number(raiseInput);
    if (!Number.isInteger(amount) || amount <= oldMax) {
      setRaiseError(`新上限须为整数且高于原上限 ${formatJpy(oldMax)}`);
      return;
    }
    setRaising(true);
    setRaiseError("");
    try {
      const res = await fetch("/api/support/mercari/raise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signBody({ id: record.id, max_bid_jpy: amount })),
      });
      const payload = await res.json().catch(() => null);
      const root = getRecord(payload);
      if (root.code === 101) {
        setRaiseError("请从客服对话重新进入");
        return;
      }
      if (root.code !== 0) {
        const errcode = root.errcode as string | undefined;
        const errmsg = root.errmsg as string | undefined;
        setRaiseError(
          errcode === "not_raisable"
            ? "当前状态不能加价"
            : errcode === "must_exceed"
              ? `新上限须高于原上限 ${formatJpy(oldMax)}`
              : errmsg || "加价失败，请重试",
        );
        return;
      }
      const data = getRecord(root.data);
      toast.success("已加价，新委托 #" + String(data.id ?? ""));
      router.push(
        `/${lang}/support/auction/mine${originalQuery ? "?" + originalQuery : ""}`,
      );
    } catch {
      setRaiseError("网络异常，请重试");
    } finally {
      setRaising(false);
    }
  }

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(
      `/${lang}/support/auction/mine${originalQuery ? "?" + originalQuery : ""}`,
    );
  }

  const themeAttr = isCandyTheme ? "candy" : undefined;

  return (
    <div
      className="min-h-screen bg-[#f5f7fb] pb-8"
      data-theme={themeAttr}
      data-testid="support-auction-mercari-detail-page"
    >
      {isCandyTheme ? <style>{CANDY_THEME_CSS}</style> : null}

      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-100 bg-white px-3 py-3">
        <button
          type="button"
          className="rounded-full p-1 text-slate-500"
          onClick={goBack}
          aria-label="返回"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 truncate text-sm font-semibold text-slate-800">
          煤炉委托详情
        </h1>
      </header>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : loadError ? (
        <div className="px-4 py-16 text-center text-sm text-slate-500">
          {loadError}
        </div>
      ) : record ? (
        <div className="px-3 py-3">
          <p className="px-1 pb-2 text-xs text-slate-500">
            <a
              href={`/${lang}/mnp`}
              className="underline underline-offset-2"
            >
              绑定公众号可免费收到被超提醒
            </a>
          </p>

          <div className="rounded-lg bg-white p-3 shadow-sm">
            {record.goods_url ? (
              <a
                href={record.goods_url}
                target="_blank"
                rel="noreferrer"
                className="flex gap-3"
              >
                {record.goods_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={record.goods_image}
                    alt={record.goods_name || "商品图片"}
                    className="h-16 w-16 flex-none rounded-md object-cover"
                  />
                ) : null}
                <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-800 underline-offset-2 hover:underline">
                  {record.goods_name || record.goods_no}
                </h2>
              </a>
            ) : (
              <div className="flex gap-3">
                {record.goods_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={record.goods_image}
                    alt={record.goods_name || "商品图片"}
                    className="h-16 w-16 flex-none rounded-md object-cover"
                  />
                ) : null}
                <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-800">
                  {record.goods_name || record.goods_no}
                </h2>
              </div>
            )}

            <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
              <p className="flex justify-between">
                <span className="text-slate-400">状态</span>
                <span className="font-medium text-slate-800">{record.status_txt || "—"}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">当前出价上限</span>
                <span className="font-semibold text-orange-600">
                  {formatJpy(record.max_bid_jpy)}
                </span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">押金占用</span>
                <span>{formatCny(record.deposit_hold_cny)}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-400">创建时间</span>
                <span className="text-slate-500">{record.create_time || "—"}</span>
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-white p-3 shadow-sm">
            <p className="text-sm font-medium text-slate-800">加价</p>
            {canRaise ? (
              <>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-slate-500">新上限 ¥</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min={Number(record.max_bid_jpy ?? 0) + 1}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    value={raiseInput}
                    onChange={(e) => setRaiseInput(e.target.value)}
                    data-testid="support-auction-mercari-raise-input"
                  />
                </div>
                {raiseError ? (
                  <p className="mt-2 text-xs text-red-500">{raiseError}</p>
                ) : null}
                <button
                  type="button"
                  className="mt-3 w-full rounded-md bg-orange-500 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={() => void submitRaise()}
                  disabled={raising}
                  data-testid="support-auction-mercari-raise-submit"
                >
                  {raising ? "提交中…" : "提交加价"}
                </button>
              </>
            ) : (
              <p className="mt-2 text-xs text-slate-400">当前状态不能加价</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
