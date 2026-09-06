import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

// H5 客服页单独定义标题（absolute 跳过根 layout 的 template 拼接），
// 避免继承根 titleDefault 里的「日本代购代拍平台」字样。
export const metadata: Metadata = {
  title: { absolute: "袋鼠酱在线客服" },
};

// page.tsx 是 "use client" 组件，客户端组件不能导出 viewport 元数据，
// 所以这里另开一个服务端 layout 专门声明视口——固定 initialScale=1 且禁止
// userScalable，防止 iOS 微信 webview 里输入框字号<16px 聚焦时触发系统自动放大，
// 放大后发送按钮会被顶出可视区域（真机实测 bug）。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function SupportH5Layout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
