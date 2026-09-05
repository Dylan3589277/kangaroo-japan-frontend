"use client";

import { useEffect, useState } from "react";

// 客服 H5「审核模式」：小程序送审期间老后台会打开该开关，H5 内一切竞拍相关
// 内容都要藏起来。读取失败一律当作 false（不藏），避免把整个 H5 弄挂。
export function useReviewMode() {
  const [loading, setLoading] = useState(true);
  const [reviewMode, setReviewMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/support/review-mode", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (cancelled) return;
        const root =
          payload !== null && typeof payload === "object"
            ? (payload as Record<string, unknown>)
            : {};
        setReviewMode(root.review_mode === true);
      })
      .catch(() => {
        if (!cancelled) setReviewMode(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, reviewMode };
}
