"use client";

import { usePathname } from "@/i18n/navigation";
import { isEmbeddedSupportPath } from "@/lib/embedded-support-paths";
import { Footer } from "./Footer";

/**
 * 在 [lang] 布局层的非 en 分支渲染买家页脚，排除规则与 SiteHeader 保持一致
 * （admin/warehouse 后台页有自己的布局/侧边栏、小程序 webview 内嵌页自带完整 UI，
 * 都不应叠加这段买家导航页脚）。
 *
 * INTERNAL_PREFIXES 与 SiteHeader.tsx 中的定义重复维护一份，而非抽公共 hook——
 * 外科手术式修改，不顺手重构 SiteHeader。
 */
const INTERNAL_PREFIXES = ["/admin", "/warehouse"];

export function SiteFooter() {
  const pathname = usePathname();
  const isInternal = INTERNAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isInternal || isEmbeddedSupportPath(pathname)) {
    return null;
  }

  return <Footer />;
}
