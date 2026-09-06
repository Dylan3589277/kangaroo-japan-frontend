"use client";

import { useEffect, useState } from "react";

import type { H5App } from "./identity";

// 客服 H5「审核模式」：小程序送审期间老后台会打开该开关，H5 内一切竞拍相关
// 内容都要藏起来。读取失败一律当作 false（不藏），避免把整个 H5 弄挂。
// 审核开关按 app（legacy/candy）分别控制，必须显式带 app 请求。
export function useReviewMode(app: H5App) {
  const [loading, setLoading] = useState(true);
  const [reviewMode, setReviewMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/support/review-mode?app=${app}`, { cache: "no-store" })
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
  }, [app]);

  return { loading, reviewMode };
}
