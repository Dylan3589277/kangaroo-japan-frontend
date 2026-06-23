"use client";

import { useEffect, useState } from "react";

import { usePathname } from "@/i18n/navigation";
import { TcgChatWidget } from "./TcgChatWidget";

/**
 * 决定是否在当前页渲染全站客服浮窗。
 *
 * 与 SiteHeader 的导航排除保持一致：内部员工页（admin / warehouse）有自己的后台
 * 布局，不显示买家客服浮窗。usePathname（next-intl）返回去掉语言前缀后的路径，
 * 因此前缀判断与语言无关，zh/en 一致。
 *
 * 另外：当本站被嵌入微信小程序 webview 时（小程序内已有原生客服入口），隐藏网页版
 * 浮窗，避免重复入口；普通网页照常显示。小程序判断复用 support/h5 页的写法：
 * Boolean(window.wx?.miniProgram?.navigateTo)（微信小程序 webview 注入）。
 */
const INTERNAL_PREFIXES = ["/admin", "/warehouse"];

type MiniProgramWindow = Window & {
  wx?: {
    miniProgram?: {
      navigateTo?: (options: { url: string }) => void;
    };
  };
};

export function ChatWidgetGate() {
  const pathname = usePathname();
  const isInternal = INTERNAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  // 初始 false，保持 SSR/首屏与服务端一致，避免水合不匹配；水合后再检测。
  const [isMini, setIsMini] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const detect = () => {
      if (cancelled || typeof window === "undefined") {
        return;
      }
      const win = window as MiniProgramWindow;
      if (win.wx?.miniProgram?.navigateTo) {
        setIsMini(true);
      }
    };

    // 不在 effect 同步体内直接 setState（规避 react-hooks/set-state-in-effect），
    // 推迟到微任务，在水合完成后执行。
    queueMicrotask(detect);

    // jweixin SDK 可能晚于本组件加载，挂 load 再检测一次兜底。
    const sdk = document.getElementById("jweixin-sdk");
    sdk?.addEventListener("load", detect);

    return () => {
      cancelled = true;
      sdk?.removeEventListener("load", detect);
    };
  }, []);

  if (isInternal || isMini) {
    return null;
  }

  return <TcgChatWidget />;
}
