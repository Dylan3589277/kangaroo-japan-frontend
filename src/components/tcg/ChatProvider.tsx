"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * 全站客服浮窗的轻量上下文。
 *
 * 目的：客服浮窗在 [lang]/layout.tsx 统一挂载（zh + en），而商品详情页深埋在
 * children 里。详情页通过这个 context 把「当前商品」带给浮窗，并请求打开浮窗，
 * 浮窗顶部据此渲染商品卡 + 「为我下单」CTA。
 *
 * 设计约束（遵守 husky 规则）：
 * - 不在 effect 里同步 setState；不在 render 读取 ref.current。
 * - openSignal 用自增计数器表示「请求打开」事件，浮窗用它驱动一次性打开。
 * - 非商品页不调用 openWithProduct → product 为 null → 浮窗走纯 FAQ，无商品卡。
 */

export interface ChatProduct {
  /** 展示标题（已翻译/原文皆可，由调用方决定）。 */
  title: string;
  /** 缩略图 URL；缺失时商品卡只显文字。 */
  image?: string;
  /** 商品价（日元整数；数据库值即日元，不除以 100）。缺失时不显价。 */
  priceJpy?: number;
  /** 平台标识，用于商品卡角标与 CTA 文案。 */
  platform: "mercari" | "yahoo" | "amazon";
  /** 点击商品卡跳转的「现有」结算/下单或联系客服路由（含 /[lang] 前缀）。 */
  href: string;
}

interface ChatContextValue {
  product: ChatProduct | null;
  /** 浮窗是否展开。由 Provider 持有，详情页与浮窗本身共享同一份开合状态。 */
  open: boolean;
  /** 设定浮窗开合（浮窗关闭按钮用）。 */
  setOpen: (open: boolean) => void;
  /** 切换浮窗开合（浮窗 launcher 按钮用）。 */
  toggleOpen: () => void;
  /** 带商品上下文打开浮窗（商品页用）。 */
  openWithProduct: (product: ChatProduct) => void;
  /** 不带商品打开浮窗（通用入口用）。 */
  openChat: () => void;
  /** 清空商品上下文（浮窗内移除商品卡时用）。 */
  clearProduct: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [product, setProduct] = useState<ChatProduct | null>(null);
  const [open, setOpen] = useState(false);

  // 「打开浮窗」只发生在事件处理器里（点击客服按钮 / launcher），不在 effect 内
  // 同步 setState，符合 husky 规则。商品页打开 → 同时设置商品上下文。
  const openWithProduct = useCallback((next: ChatProduct) => {
    setProduct(next);
    setOpen(true);
  }, []);

  const openChat = useCallback(() => {
    setOpen(true);
  }, []);

  const toggleOpen = useCallback(() => {
    setOpen((current) => !current);
  }, []);

  const clearProduct = useCallback(() => {
    setProduct(null);
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({
      product,
      open,
      setOpen,
      toggleOpen,
      openWithProduct,
      openChat,
      clearProduct,
    }),
    [product, open, toggleOpen, openWithProduct, openChat, clearProduct],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/**
 * 浮窗自身消费整个 context。
 */
export function useChatWidgetContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChatWidgetContext must be used within <ChatProvider>");
  }
  return ctx;
}

/**
 * 商品详情页用的便捷钩子：拿到「带商品打开客服」的方法。
 * Provider 不存在时返回 no-op（例如内部页不挂 Provider），调用方无需判空。
 */
export function useChatLauncher(): Pick<
  ChatContextValue,
  "openWithProduct" | "openChat"
> {
  const ctx = useContext(ChatContext);
  return useMemo(
    () => ({
      openWithProduct: ctx?.openWithProduct ?? (() => {}),
      openChat: ctx?.openChat ?? (() => {}),
    }),
    [ctx],
  );
}
