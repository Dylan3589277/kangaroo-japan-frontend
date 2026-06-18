"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";

/**
 * Yahoo 在线出价确认弹窗（经典 zh / 设计 A en 两端共用）。
 *
 * 真金白银的提交动作，遵守以下硬约束：
 * - 提交体**只发** { goodsNo, money } 两字段。后端开了 forbidNonWhitelisted，
 *   多发任何字段都会 400，故这里绝不附加 locale / title 等。
 * - 金额一律 JPY 整数（不除以 100），严格校验：正整数、非空、≥ 当前价。
 * - 本弹窗本身即「二次确认」步骤——按钮不一键直发，先打开弹窗 → 填金额 → 确认。
 * - 提交中 disabled + loading 防重复点击。
 * - 失败把后端明确报错原样友好展示，绝不静默、绝不崩；网络异常有兜底文案。
 *
 * 只触碰前端展示与一个已就绪的后端写端点（POST /yahoo/bid），不碰支付/其它逻辑。
 * 后端 7 道安全闸 fail-closed（开关默认 OFF / 白名单 / 必须绑定会员 / 押金限额超价
 * 由旧引擎判），故未开放前任何人点了只会被礼貌拒绝、不会真出价。
 */

export type YahooBidModalVariant = "classic" | "designA";

type YahooBidModalProps = {
  open: boolean;
  onClose: () => void;
  goodsNo: string;
  /** 商品名（已按 locale 取译文/原文，仅展示用，不进提交体） */
  title: string;
  /** 当前价（JPY 整数），用于校验下限与默认值；缺失时不设默认、按 ≥1 校验 */
  currentPrice?: number;
  /** locale 主题：classic = 暖色浅底（zh），designA = 深色 cyan（en） */
  variant: YahooBidModalVariant;
};

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

// 出价响应：后端透传旧引擎结果，字段全部容错 optional。
type YahooBidResult = {
  message?: string;
  msg?: string;
};

export function YahooBidModal({
  open,
  onClose,
  goodsNo,
  title,
  currentPrice,
  variant,
}: YahooBidModalProps) {
  const t = useTranslations("yahoo");
  const dark = variant === "designA";
  const titleId = useId();
  const inputId = useId();

  const [amount, setAmount] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  // 打开时初始化：默认填「当前价」（有则填，无则空），清空上一轮状态、锁滚动、聚焦。
  // 仅依赖 open + goodsNo（换商品重置），不读 amount 自身，避免循环。
  useEffect(() => {
    if (!open) return;

    // 打开弹窗这一外部事件触发的内部表单状态复位，是 effect 的合法用途。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAmount(
      currentPrice !== undefined && currentPrice > 0 ? String(currentPrice) : "",
    );
    setValidationError(null);
    setSubmit({ kind: "idle" });

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [open, goodsNo, currentPrice]);

  // Esc 关闭（提交中不允许关，防中途打断写请求）。
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && submit.kind !== "submitting") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, submit.kind]);

  if (!open) return null;

  // 严格校验：非空 / 正整数 / ≥ 当前价（无当前价则 ≥1）。返回 JPY 整数或 null。
  const validate = (): number | null => {
    const raw = amount.trim();
    if (!raw) {
      setValidationError(t("bidModal.errors.required"));
      return null;
    }
    // 仅允许纯数字（JPY 整数，不接受小数/负号/逗号）。
    if (!/^\d+$/.test(raw)) {
      setValidationError(t("bidModal.errors.integer"));
      return null;
    }
    const money = Number(raw);
    if (!Number.isInteger(money) || money <= 0) {
      setValidationError(t("bidModal.errors.integer"));
      return null;
    }
    const floor = currentPrice !== undefined && currentPrice > 0 ? currentPrice : 1;
    if (money < floor) {
      setValidationError(
        t("bidModal.errors.belowCurrent", { amount: floor.toLocaleString() }),
      );
      return null;
    }
    setValidationError(null);
    return money;
  };

  const handleSubmit = async () => {
    if (submit.kind === "submitting") return; // 防重复点击
    const money = validate();
    if (money === null) return;

    setSubmit({ kind: "submitting" });
    try {
      // 只发 goodsNo + money 两字段（forbidNonWhitelisted）。
      const response = await api.request<YahooBidResult>("/yahoo/bid", {
        method: "POST",
        body: { goodsNo, money },
      });

      if (response.success) {
        const backendMessage =
          response.data?.message?.trim() || response.data?.msg?.trim();
        setSubmit({
          kind: "success",
          message: backendMessage || t("bidModal.success"),
        });
        return;
      }

      // 失败：原样友好展示后端明确报错；无文案时兜底。
      const backendError = response.error?.message?.trim();
      setSubmit({
        kind: "error",
        message: backendError || t("bidModal.errors.generic"),
      });
    } catch {
      // 网络/异常兜底。
      setSubmit({ kind: "error", message: t("bidModal.errors.network") });
    }
  };

  const submitting = submit.kind === "submitting";
  const succeeded = submit.kind === "success";

  const priceText =
    currentPrice !== undefined && currentPrice > 0
      ? `JPY ${currentPrice.toLocaleString()}`
      : t("priceUnavailable");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md overflow-hidden rounded-t-2xl shadow-xl sm:rounded-2xl ${
          dark
            ? "border border-white/[0.08] bg-[#0e131d] text-slate-200"
            : "border bg-card text-foreground"
        }`}
      >
        {/* 头部 */}
        <div
          className={`flex items-start justify-between gap-3 px-5 py-4 ${
            dark ? "border-b border-white/[0.06]" : "border-b"
          }`}
        >
          <h2
            id={titleId}
            className={`text-base font-semibold ${dark ? "text-white" : ""}`}
          >
            {t("bidModal.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label={t("bidModal.cancel")}
            className={`-mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              dark
                ? "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <svg
              className="size-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeWidth={1.8} d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* 主体 */}
        <div className="px-5 py-4">
          {succeeded ? (
            <div className="py-4 text-center">
              <div
                className={`mx-auto flex size-12 items-center justify-center rounded-full ${
                  dark ? "bg-cyan-400/15 text-cyan-300" : "bg-orange-100 text-orange-600 dark:bg-orange-950/40"
                }`}
              >
                <svg
                  className="size-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p
                className={`mt-3 text-sm leading-6 ${
                  dark ? "text-slate-200" : "text-foreground"
                }`}
              >
                {submit.message}
              </p>
            </div>
          ) : (
            <>
              {/* 商品名 + 当前价 */}
              <p
                className={`line-clamp-2 text-sm font-medium ${
                  dark ? "text-slate-100" : "text-foreground"
                }`}
              >
                {title}
              </p>
              <div
                className={`mt-3 flex items-baseline justify-between rounded-xl px-4 py-3 ${
                  dark ? "bg-white/[0.04]" : "bg-orange-50 dark:bg-orange-950/30"
                }`}
              >
                <span
                  className={`text-xs ${dark ? "text-slate-400" : "text-orange-700 dark:text-orange-400"}`}
                >
                  {t("currentPrice")}
                </span>
                <span
                  className={`text-lg font-bold tabular-nums ${
                    dark ? "text-cyan-300" : "text-orange-600"
                  }`}
                >
                  {priceText}
                </span>
              </div>

              {/* 金额输入 */}
              <label
                htmlFor={inputId}
                className={`mt-4 block text-xs font-medium ${
                  dark ? "text-slate-400" : "text-muted-foreground"
                }`}
              >
                {t("bidModal.amountLabel")}
              </label>
              <div className="relative mt-1.5">
                <span
                  className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold ${
                    dark ? "text-slate-500" : "text-muted-foreground"
                  }`}
                >
                  JPY
                </span>
                <input
                  id={inputId}
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={amount}
                  disabled={submitting}
                  onChange={(e) => {
                    // 只保留数字字符，过滤粘贴进来的逗号/符号。
                    setAmount(e.target.value.replace(/[^\d]/g, ""));
                    if (validationError) setValidationError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !submitting) void handleSubmit();
                  }}
                  placeholder={t("bidModal.amountPlaceholder")}
                  className={`h-12 w-full rounded-xl pl-12 pr-3 text-lg font-bold tabular-nums outline-none transition-colors disabled:opacity-60 ${
                    dark
                      ? "border border-white/[0.12] bg-white/[0.03] text-white focus:border-cyan-400/60"
                      : "border bg-background focus:border-orange-500"
                  } ${validationError ? (dark ? "border-rose-400/70" : "border-red-500") : ""}`}
                />
              </div>
              {validationError && (
                <p className={`mt-1.5 text-xs ${dark ? "text-rose-300" : "text-red-600"}`}>
                  {validationError}
                </p>
              )}

              {/* 真实出价提示 */}
              <p
                className={`mt-3 rounded-xl px-3 py-2.5 text-[11px] leading-5 ${
                  dark ? "bg-white/[0.03] text-slate-400" : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {t("bidModal.realBidNotice")}
              </p>

              {/* 后端错误展示 */}
              {submit.kind === "error" && (
                <div
                  className={`mt-3 rounded-xl px-3 py-2.5 text-xs leading-5 ${
                    dark
                      ? "border border-rose-400/30 bg-rose-400/10 text-rose-200"
                      : "border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                  }`}
                >
                  {submit.message}
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部操作 */}
        <div
          className={`flex gap-3 px-5 py-4 ${dark ? "border-t border-white/[0.06]" : "border-t"}`}
        >
          {succeeded ? (
            <button
              type="button"
              onClick={onClose}
              className={`h-11 flex-1 rounded-xl text-sm font-semibold transition-colors ${
                dark
                  ? "bg-cyan-400 text-[#06121b] hover:bg-cyan-300"
                  : "bg-orange-600 text-white hover:bg-orange-700"
              }`}
            >
              {t("bidModal.done")}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className={`h-11 flex-1 rounded-xl border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  dark
                    ? "border-white/15 text-slate-300 hover:bg-white/5"
                    : "hover:bg-muted"
                }`}
              >
                {t("bidModal.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  dark
                    ? "bg-cyan-400 text-[#06121b] hover:bg-cyan-300"
                    : "bg-orange-600 text-white hover:bg-orange-700"
                }`}
              >
                {submitting && (
                  <svg
                    className="size-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                {submitting ? t("bidModal.submitting") : t("bidModal.confirm")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
