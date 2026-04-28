import { Noto_Sans_SC, Noto_Sans_JP, Noto_Sans, Inter } from "next/font/google";

// Latin/English — Inter as primary
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

// Chinese (Simplified) — Noto Sans SC
export const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-noto-sans-sc",
  display: "swap",
  preload: false, // preload only for the most common locale
});

// Japanese — Noto Sans JP
export const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  preload: false,
});

// Fallback — Noto Sans (covers additional characters)
export const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  display: "swap",
  preload: false,
});
