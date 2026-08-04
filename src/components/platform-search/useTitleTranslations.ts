"use client";

import { useEffect, useRef, useState } from "react";

/** 与 /api/translate-titles 的 MAX_TITLES 对齐，单次请求最多带这么多条标题。 */
const CHUNK_SIZE = 40;

/**
 * zh 列表卡片标题日译中（客户端 hook）。
 *
 * - 去重：同一标题在同一批 titles 里只算一条。
 * - 只问一次：已经请求过的标题（无论成功还是失败）不会重复占用配额，
 *   避免同一批坏标题/同一页反复渲染时打后端。
 * - 不阻塞首屏：请求在 useEffect 里异步发起，调用方应先用原文渲染，
 *   译文回来后这里返回的 map 会补上，触发一次重渲染。
 * - 失败静默：网络错误 / 非 2xx / 结构不符都直接跳过，不抛错、不重试。
 *
 * 用法：
 *   const titleTranslations = useTitleTranslations(sortedItems.map(i => i.title));
 *   ... translatedTitle={titleTranslations[item.title]}
 */
export function useTitleTranslations(
  titles: string[],
): Record<string, string> {
  const [translations, setTranslations] = useState<Record<string, string>>(
    {},
  );
  const requestedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unique = Array.from(
      new Set(
        titles
          .map((title) => (typeof title === "string" ? title.trim() : ""))
          .filter(Boolean),
      ),
    );
    const pending = unique.filter((title) => !requestedRef.current.has(title));
    if (pending.length === 0) return;
    pending.forEach((title) => requestedRef.current.add(title));

    const chunks: string[][] = [];
    for (let i = 0; i < pending.length; i += CHUNK_SIZE) {
      chunks.push(pending.slice(i, i + CHUNK_SIZE));
    }

    let cancelled = false;

    (async () => {
      for (const chunk of chunks) {
        if (cancelled) return;
        try {
          const res = await fetch("/api/translate-titles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ titles: chunk }),
          });
          if (!res.ok) continue;
          const data = (await res.json()) as {
            translations?: (string | null)[];
          };
          if (cancelled || !Array.isArray(data.translations)) continue;

          const next: Record<string, string> = {};
          chunk.forEach((title, i) => {
            const translated = data.translations?.[i];
            if (translated) next[title] = translated;
          });
          if (Object.keys(next).length > 0) {
            setTranslations((prev) => ({ ...prev, ...next }));
          }
        } catch {
          // 静默失败：保留日文原名，不阻塞列表、不重试。
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [titles]);

  return translations;
}
