"use client";

import { usePathname } from "@/i18n/navigation";
import { TcgChatWidget } from "./TcgChatWidget";

/**
 * 决定是否在当前页渲染全站客服浮窗。
 *
 * 与 SiteHeader 的导航排除保持一致：内部员工页（admin / warehouse）有自己的后台
 * 布局，不显示买家客服浮窗。usePathname（next-intl）返回去掉语言前缀后的路径，
 * 因此前缀判断与语言无关，zh/en 一致。
 *
 * 另：H5 在线客服页（/support/h5）本身就是一个完整的客服会话页（小程序 webview
 * 内嵌），页面里已有自己的客服 UI，再叠一个全站浮动客服入口既重复又会遮挡。故在
 * 该路径下隐藏浮窗（zh/en 都隐藏，路径已去语言前缀）。
 */
const INTERNAL_PREFIXES = ["/admin", "/warehouse"];

export function ChatWidgetGate() {
  const pathname = usePathname();
  const isInternal = INTERNAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isInternal || (pathname && pathname.includes("/support/h5"))) {
    return null;
  }

  return <TcgChatWidget />;
}
