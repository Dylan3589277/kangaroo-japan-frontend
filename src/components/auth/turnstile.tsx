"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile 人机验证（gated + 优雅降级）。
 *
 * 安全边界 / 设计：
 * - site key 读 NEXT_PUBLIC_TURNSTILE_SITE_KEY。**未配置 key 时不渲染、不阻断登录**，
 *   onToken(null) 让表单照常可提交（等花哥配 key 才真正生效）。
 * - 不引入第三方 npm 依赖，直接用官方脚本 https://challenges.cloudflare.com/turnstile/v0/api.js，
 *   显式 render，避免与 SSR / 多实例冲突。
 * - 拿到 token 通过 onToken 回传给表单，随表单字段（turnstileToken）提交给后端校验。
 * - token 过期 / 出错时回传 null，由表单自行决定是否拦截（当前默认不硬拦，软模式）。
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileRenderOptions = {
  sitekey: string;
  callback?: (token: string) => void;
  "error-callback"?: () => void;
  "expired-callback"?: () => void;
  "timeout-callback"?: () => void;
  theme?: "auto" | "light" | "dark";
  size?: "normal" | "flexible" | "compact";
  language?: string;
};

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: TurnstileRenderOptions,
  ) => string | undefined;
  remove: (widgetId: string) => void;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    onTurnstileLoad?: () => void;
  }
}

export function isTurnstileConfigured(): boolean {
  return Boolean(SITE_KEY);
}

export function Turnstile({
  onToken,
  theme = "auto",
  className,
  language,
}: {
  onToken: (token: string | null) => void;
  theme?: "auto" | "light" | "dark";
  className?: string;
  language?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const renderWidget = useCallback(() => {
    if (!SITE_KEY) return;
    if (!window.turnstile || !containerRef.current) return;
    if (widgetIdRef.current) return; // already rendered

    widgetIdRef.current =
      window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme,
        language,
        callback: (token: string) => onToken(token),
        "error-callback": () => onToken(null),
        "expired-callback": () => onToken(null),
        "timeout-callback": () => onToken(null),
      }) ?? null;
  }, [onToken, theme, language]);

  useEffect(() => {
    if (!SITE_KEY) return;
    if (scriptReady) renderWidget();
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup errors
        }
        widgetIdRef.current = null;
      }
    };
  }, [scriptReady, renderWidget]);

  // 未配置 key：优雅降级，渲染空 + 不阻断登录。
  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src={SCRIPT_SRC}
        strategy="lazyOnload"
        onReady={() => setScriptReady(true)}
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} className={className} />
    </>
  );
}
