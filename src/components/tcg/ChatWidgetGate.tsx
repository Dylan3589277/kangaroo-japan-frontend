"use client";

import { usePathname } from "@/i18n/navigation";
import { TcgChatWidget } from "./TcgChatWidget";

/**
 * 决定是否在当前页渲染全站客服浮窗。
 *
 * 与 SiteHeader 的导航排除保持一致：内部员工页（admin / warehouse）有自己的后台
 * 布局，不显示买家客服浮窗。usePathname（next-intl）返回去掉语言前缀后的路径，
 * 因此前缀判断与语言无关，zh/en 一致。
 */
const INTERNAL_PREFIXES = ["/admin", "/warehouse"];

export function ChatWidgetGate() {
  const pathname = usePathname();
  const isInternal = INTERNAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isInternal) {
    return null;
  }

  return <TcgChatWidget />;
}
