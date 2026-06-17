"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * 设计 A（深色高级感）详情页通用图片放大查看 lightbox。
 *
 * 纯前端、无新依赖：用 fixed 全屏遮罩 + CSS transform 缩放，z-index 高于 TcgHeader
 * (sticky z-50)，故用 z-[70]。供 Mercari / Yahoo 设计 A 详情图廊复用——点主图打开，
 * 支持滚轮 / 双击缩放、拖拽平移、左右切图、Esc / 点遮罩关闭、移动端双指 + 双击放大。
 *
 * 只读展示层：不触碰任何业务逻辑 / 后端 / 支付，仅放大已加载的商品图。
 */

type ImageLightboxProps = {
  images: string[];
  /** 初始展示的图片下标 */
  index: number;
  /** 图片 alt 前缀（通常为商品标题） */
  alt: string;
  open: boolean;
  onClose: () => void;
  /** 切换当前下标（左右箭头 / 缩略图） */
  onIndexChange: (index: number) => void;
  /** i18n 文案，缺省退化为英文 */
  labels?: {
    close?: string;
    prev?: string;
    next?: string;
    zoomIn?: string;
    zoomOut?: string;
    reset?: string;
    hint?: string;
  };
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const STEP = 0.5;

export function ImageLightbox({
  images,
  index,
  alt,
  open,
  onClose,
  onIndexChange,
  labels,
}: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const draggingRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  const total = images.length;
  const safeIndex = total > 0 ? ((index % total) + total) % total : 0;
  const current = images[safeIndex];

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const goPrev = useCallback(() => {
    if (total < 2) return;
    onIndexChange((safeIndex - 1 + total) % total);
    resetView();
  }, [onIndexChange, resetView, safeIndex, total]);

  const goNext = useCallback(() => {
    if (total < 2) return;
    onIndexChange((safeIndex + 1) % total);
    resetView();
  }, [onIndexChange, resetView, safeIndex, total]);

  const clampScale = (next: number) =>
    Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));

  const zoomIn = useCallback(() => {
    setScale((s) => clampScale(s + STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => {
      const next = clampScale(s - STEP);
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // 键盘：Esc 关、左右切图、+/- 缩放。打开时锁滚动，关闭时复原视图。
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        goPrev();
      } else if (e.key === "ArrowRight") {
        goNext();
      } else if (e.key === "+" || e.key === "=") {
        zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        zoomOut();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, goPrev, goNext, zoomIn, zoomOut]);

  // 每次打开 / 切换目标图时复位缩放与平移（仅依赖 open + index，避免循环）。
  useEffect(() => {
    // 打开/切图时把内部缩放·平移状态复位——按外部 open/index 重置内部视图状态，
    // 是该 effect 的合法用途。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) resetView();
  }, [open, index, resetView]);

  if (!open || !current) return null;

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => {
      const next = clampScale(s + (e.deltaY < 0 ? STEP : -STEP));
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const onDoubleClick = () => {
    setScale((s) => {
      if (s > 1) {
        setOffset({ x: 0, y: 0 });
        return 1;
      }
      return 2;
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    movedRef.current = false;
    if (scale <= 1) return;
    draggingRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    movedRef.current = true;
    setOffset({
      x: e.clientX - draggingRef.current.x,
      y: e.clientY - draggingRef.current.y,
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    draggingRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // 点击遮罩空白处（非图片、未拖动）关闭。
  const onBackdropClick = () => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    onClose();
  };

  const l = {
    close: labels?.close ?? "Close",
    prev: labels?.prev ?? "Previous image",
    next: labels?.next ?? "Next image",
    zoomIn: labels?.zoomIn ?? "Zoom in",
    zoomOut: labels?.zoomOut ?? "Zoom out",
    reset: labels?.reset ?? "Reset",
    hint:
      labels?.hint ??
      "Scroll or double-click to zoom · drag to pan · arrow keys to switch · Esc to close",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onBackdropClick}
    >
      {/* 顶部工具条 */}
      <div
        className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium tabular-nums text-slate-200">
          {safeIndex + 1} / {total}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={zoomOut}
            aria-label={l.zoomOut}
            disabled={scale <= MIN_SCALE}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-200 transition-colors hover:border-cyan-400/50 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeWidth={1.8} d="M5 12h14" />
            </svg>
          </button>
          <button
            type="button"
            onClick={zoomIn}
            aria-label={l.zoomIn}
            disabled={scale >= MAX_SCALE}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-200 transition-colors hover:border-cyan-400/50 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeWidth={1.8} d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={l.close}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-200 transition-colors hover:border-rose-400/50 hover:text-rose-200"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeWidth={1.8} d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      {/* 左右切换 */}
      {total > 1 && (
        <>
          <button
            type="button"
            aria-label={l.prev}
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-3 top-1/2 z-[2] inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-slate-100 transition-colors hover:border-cyan-400/50 hover:text-cyan-200"
          >
            <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={l.next}
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-3 top-1/2 z-[2] inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-slate-100 transition-colors hover:border-cyan-400/50 hover:text-cyan-200"
          >
            <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* 图片舞台 */}
      <div
        className="relative flex h-full w-full items-center justify-center px-4 py-16 sm:px-16"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative h-full w-full select-none touch-none"
          style={{
            cursor: scale > 1 ? "grab" : "zoom-in",
          }}
          onWheel={onWheel}
          onDoubleClick={onDoubleClick}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <Image
            key={current}
            src={current}
            alt={`${alt} ${safeIndex + 1}`}
            fill
            unoptimized
            draggable={false}
            className="object-contain transition-transform duration-100"
            sizes="100vw"
            priority
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            }}
          />
        </div>
      </div>

      {/* 底部提示 */}
      <p
        className="absolute inset-x-0 bottom-4 px-4 text-center text-[11px] text-slate-400"
        onClick={(e) => e.stopPropagation()}
      >
        {l.hint}
      </p>
    </div>
  );
}
