"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertForm } from "./AlertForm";
import type { AlertFilters } from "./alerts-data";

/**
 * 设计 A 上新提醒 modal。供搜索页「🔔 Alert me for this search」复用：
 * 用当前 keyword + 已选 filters 预填 AlertForm。
 *
 * 关闭交互对齐 ImageLightbox：✕ 按钮 / Esc / 点遮罩都能关；打开时锁 body 滚动。
 * Esc / 锁滚动放在 effect 里（监听外部 open 事件、操作 DOM——effect 的合法用途，
 * 且不在 effect 里同步 setState、不在 render 读 ref.current）。
 */

export interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  defaultKeyword?: string;
  defaultFilters?: AlertFilters;
}

export function AlertModal({
  open,
  onClose,
  defaultKeyword,
  defaultFilters,
}: AlertModalProps) {
  const t = useTranslations("tcg-alerts.modal");

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative my-auto w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1320] p-6 shadow-2xl shadow-black/60 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮（✕） */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-200 transition-colors hover:border-rose-400/50 hover:text-rose-200"
        >
          <svg
            className="size-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeWidth={1.8}
              d="M6 6l12 12M18 6L6 18"
            />
          </svg>
        </button>

        <div className="pr-10">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">
            {t("title")}
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">{t("subtitle")}</p>
          {(defaultKeyword ||
            (defaultFilters && Object.keys(defaultFilters).length > 0)) && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/[0.08] px-3 py-1 text-xs text-cyan-200">
              {t("prefillNote")}
            </p>
          )}
        </div>

        <div className="mt-6">
          <AlertForm
            defaultKeyword={defaultKeyword}
            defaultFilters={defaultFilters}
            onSuccess={() => {
              // 成功后不立刻关 modal：AlertForm 内部已切到成功态（去邮箱确认提示），
              // 让用户读完提示再自行关闭。
            }}
            compact
          />
        </div>
      </div>
    </div>
  );
}
