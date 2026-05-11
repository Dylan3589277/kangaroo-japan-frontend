"use client";

import Script from "next/script";
import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";

const TAWK_PROPERTY_ID = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID || "69f2b3635ac9531c37ee0244";
const TAWK_WIDGET_ID = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID || "1jne0pfbd";

type TawkApi = {
  onLoad?: () => void;
  setAttributes?: (attributes: Record<string, string>, callback?: (error?: unknown) => void) => void;
};

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

function getLocaleFromPath(pathname: string | null) {
  const locale = pathname?.split("/").filter(Boolean)[0];
  return locale === "en" || locale === "ja" || locale === "zh" ? locale : "zh";
}

function setLowRiskTawkAttributes(pathname: string | null) {
  if (typeof window === "undefined") return;

  window.Tawk_API?.setAttributes?.(
    {
      site: "kangaroo-japan",
      locale: getLocaleFromPath(pathname),
      page_path: `${window.location.pathname}${window.location.search}`,
      currency: "jpy",
      support_channel: "public_site",
    },
    () => undefined
  );
}

/**
 * Tawk.to 客服在线聊天 Widget（袋鼠君日本代拍专用）
 *
 * 安全边界：
 * - 只在公开站点加载，排除 /admin 和 /warehouse 路径。
 * - 只向 tawk.to 传站点、语言、页面路径、币种等低敏字段。
 * - 预聊天表单的姓名、邮箱、问题类型、问题描述需要在 tawk.to 后台开启和配置。
 */
export function TawkToWidget() {
  const pathname = usePathname();
  const scriptSrc = useMemo(() => `https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`, []);

  useEffect(() => {
    setLowRiskTawkAttributes(pathname);
  }, [pathname]);

  // 排除 admin 和 warehouse 路径，避免第三方脚本记录后台路径和操作行为。
  if (pathname?.includes("/admin") || pathname?.includes("/warehouse")) {
    return null;
  }

  return (
    <Script
      id="tawkto-widget"
      src={scriptSrc}
      strategy="lazyOnload"
      crossOrigin="anonymous"
      onReady={() => setLowRiskTawkAttributes(pathname)}
      onLoad={() => setLowRiskTawkAttributes(pathname)}
    />
  );
}
