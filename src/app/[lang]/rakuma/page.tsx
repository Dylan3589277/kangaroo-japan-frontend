"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { spaceGrotesk } from "@/app/fonts";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * /[lang]/rakuma — 楽天ラクマ 落地页（粘贴商品链接 → 跳详情）。
 *
 * ラクマ/Rakuma 没有列表/搜索 API（详情靠抓单个商品网页），因此本页提供
 * "粘贴商品链接"入口：解析出 publicHash → router.push(/[lang]/rakuma/[hash])。
 *
 * 按 locale 分支呈现，与详情页一致：
 * - en：设计 A 深色风。
 * - 其它语言：经典暖色风。
 */

/**
 * 从用户粘贴的内容中提取 ラクマ 商品 publicHash。
 * 详情上游为 https://item.fril.jp/{publicHash}。
 * 支持：item.fril.jp/xxxx、fril.jp/xxxx、fril.jp/item/xxxx、带/不带 https、
 * 带/不带 query、末尾斜杠、以及直接粘一串纯 hash。
 * 解析不出返回 null。
 */
function parseRakumaHash(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;

  // 纯 hash（无空格、无斜杠、无协议）→ 直接当 ID
  if (!/[\s/]/.test(input) && !/^https?:/i.test(input)) {
    return input;
  }

  // 容错补全协议，便于 URL 解析
  const withProto = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(withProto);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!host.includes("fril.jp") && !host.includes("rakuma")) {
    return null;
  }

  // 路径形如 /{hash} 或 /item/{hash}
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  const last = segments[segments.length - 1];
  return last || null;
}

export default function RakumaLandingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = use(params);
  const router = useRouter();
  const t = useTranslations("rakuma.paste");

  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hash = parseRakumaHash(value);
    if (!hash) {
      setError(true);
      return;
    }
    setError(false);
    router.push(`/${lang}/rakuma/${encodeURIComponent(hash)}`);
  };

  const isEn = lang === "en";

  if (isEn) {
    return (
      <main
        className={`${spaceGrotesk.variable} flex min-h-[70vh] items-center justify-center bg-[#0a0e16] px-4 py-16 text-slate-200 antialiased`}
      >
        <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {t("description")}
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <Input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(false);
              }}
              placeholder={t("placeholder")}
              aria-invalid={error}
              className="h-11 border-white/15 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
            />
            {error && (
              <p className="text-xs text-rose-400">{t("error")}</p>
            )}
            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-cyan-400 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300"
            >
              {t("submit")}
            </button>
          </form>
          <p className="mt-4 text-[11px] leading-relaxed text-slate-600">
            {t("example")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md p-7">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("description")}
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(false);
            }}
            placeholder={t("placeholder")}
            aria-invalid={error}
            className="h-11"
          />
          {error && <p className="text-xs text-destructive">{t("error")}</p>}
          <Button
            type="submit"
            className="h-11 w-full bg-orange-500 hover:bg-orange-600"
          >
            {t("submit")}
          </Button>
        </form>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          {t("example")}
        </p>
      </Card>
    </div>
  );
}
