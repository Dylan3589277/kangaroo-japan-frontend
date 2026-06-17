import { Space_Grotesk } from "next/font/google";

const FONT_STACKS = {
  latin: "Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif",
  sc: "'Noto_Sans_SC','PingFang_SC','Microsoft_YaHei',system-ui,sans-serif",
  jp: "'Noto_Sans_JP','Hiragino_Kaku_Gothic_ProN','Yu_Gothic',Meiryo,system-ui,sans-serif",
  global: "'Noto_Sans',Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif",
} as const;

const fontVariable = (name: string, stack: string) => ({ variable: `[${name}:${stack}]` });

export const inter = fontVariable("--font-inter", FONT_STACKS.latin);
export const notoSansSC = fontVariable("--font-noto-sans-sc", FONT_STACKS.sc);
export const notoSansJP = fontVariable("--font-noto-sans-jp", FONT_STACKS.jp);
export const notoSans = fontVariable("--font-noto-sans", FONT_STACKS.global);

/**
 * 展示字体：仅给美国 TCG 英文首页（设计方向 A 深色高级感）使用。
 * 通过 next/font/google 自托管 Space Grotesk（强字重 grotesk），暴露 CSS 变量
 * --font-display；不在全局 layout 应用，由 <TcgHome/> 在自身根节点挂载 .variable
 * 类后用 font-[family-name:var(--font-display)] 引用，避免影响其它语言页面。
 */
export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-display",
});
