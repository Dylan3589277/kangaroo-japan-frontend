"use client";

import { usePathname } from "@/i18n/navigation";
import { Header } from "./Header";

/**
 * 在 [lang] 布局层统一渲染一次买家导航 Header，杜绝各页面零散引入导致的漏导航。
 *
 * 排除内部员工页（admin / warehouse）：这些页面有自己的后台布局与侧边栏，
 * 不应显示买家导航。usePathname（来自 next-intl）返回的是去掉语言前缀后的路径，
 * 例如 /admin/orders、/warehouse，因此前缀判断与语言无关。
 *
 * 不在此处接管「需要页面级搜索逻辑」的搜索框（products 页有自带的页内搜索表单），
 * 统一渲染基础 Header 即可。
 */
const INTERNAL_PREFIXES = ["/admin", "/warehouse"];

export function SiteHeader() {
  const pathname = usePathname();
  const isInternal = INTERNAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isInternal) {
    return null;
  }

  return <Header />;
}
