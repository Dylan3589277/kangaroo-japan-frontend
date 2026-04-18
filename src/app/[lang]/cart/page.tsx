"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface CartItem {
  id: string;
  product: {
    id: string;
    title: string;
    coverImage: string | null;
    platform: string;
    priceJpy: number;
    priceCny: number;
  };
  quantity: number;
  unitPriceJpy: number;
  unitPriceCny: number;
  subtotalJpy: number;
  subtotalCny: number;
  options: Record<string, unknown>;
  buyerMessage?: string;
  seller: {
    id: string;
    name: string;
  };
}

interface SellerGroup {
  seller: { id: string; name: string };
  items: CartItem[];
  subtotal: number;
}

interface CartSummary {
  totalItems: number;
  subtotalJpy: number;
  subtotalCny: number;
  subtotalUsd: number;
  estimatedShippingJpy: number;
  estimatedShippingCny: number;
  totalJpy: number;
  totalCny: number;
  currency: string;
}

interface CartData {
  id: string;
  items: CartItem[];
  summary: CartSummary;
  groupedBySeller: SellerGroup[];
}

const PLATFORM_COLORS: Record<string, string> = {
  amazon: "bg-yellow-500",
  mercari: "bg-red-500",
  rakuten: "bg-red-600",
  yahoo: "bg-purple-500",
};

const PLATFORM_NAMES: Record<string, string> = {
  amazon: "Amazon",
  mercari: "Mercari",
  rakuten: "Rakuten",
  yahoo: "Yahoo",
};

function formatCurrency(amount: number, currency: string = "CNY"): string {
  if (currency === "JPY") return `¥${Math.round(amount).toLocaleString()}`;
  if (currency === "USD") return `$${amount.toFixed(2)}`;
  return `¥${amount.toFixed(2)}`;
}

export default function CartPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  // Simple i18n mapping
  const i18n: Record<string, Record<string, string>> = {
    zh: {
      shoppingCart: "购物车",
      yourCartIsEmpty: "购物车是空的",
      startShopping: "开始购物以添加商品",
      browseProducts: "浏览商品",
      clearAll: "清空购物车",
      orderSummary: "订单摘要",
      items: "商品",
      subtotalJpy: "小计 (JPY)",
      estimatedShipping: "预计运费",
      total: "总计",
      proceedToCheckout: "去结算",
      shippingFinalized: "运费将在结算时确定",
      unknownSeller: "未知卖家",
      noImage: "无图片",
      giftWrap: "礼品包装 🎁",
      messageForSeller: "留言给卖家（可选）",
      save: "保存",
      remove: "删除",
      subtotal: "小计",
      quantityUpdated: "数量已更新",
      itemRemoved: "商品已从购物车移除",
      messageSaved: "留言已保存",
      confirmClear: "确定要清空购物车吗？",
    },
    en: {
      shoppingCart: "Shopping Cart",
      yourCartIsEmpty: "Your cart is empty",
      startShopping: "Start shopping to add items to your cart",
      browseProducts: "Browse Products",
      clearAll: "Clear All",
      orderSummary: "Order Summary",
      items: "Items",
      subtotalJpy: "Subtotal (JPY)",
      estimatedShipping: "Estimated Shipping",
      total: "Total",
      proceedToCheckout: "Proceed to Checkout",
      shippingFinalized: "Shipping cost will be finalized at checkout",
      unknownSeller: "Unknown Seller",
      noImage: "No Image",
      giftWrap: "Gift Wrap 🎁",
      messageForSeller: "Message for seller (optional)",
      save: "Save",
      remove: "Remove",
      subtotal: "Subtotal",
      quantityUpdated: "Quantity updated",
      itemRemoved: "Item removed from cart",
      messageSaved: "Message saved",
      confirmClear: "Are you sure you want to clear all items?",
    },
    ja: {
      shoppingCart: "カート",
      yourCartIsEmpty: "カートは空です",
      startShopping: "ショッピングを始めてカートに商品を追加しましょう",
      browseProducts: "商品を見る",
      clearAll: "全てクリア",
      orderSummary: "注文概要",
      items: "商品",
      subtotalJpy: "小計 (JPY)",
      estimatedShipping: "配送料（約）",
      total: "合計",
      proceedToCheckout: "お会計へ進む",
      shippingFinalized: "送料はチェックアウト時に確定します",
      unknownSeller: "不明な卖家",
      noImage: "画像なし",
      giftWrap: "ギフト包装 🎁",
      messageForSeller: "卖家へのメッセージ（任意）",
      save: "保存",
      remove: "削除",
      subtotal: "小計",
      quantityUpdated: "数量を更新しました",
      itemRemoved: "商品をカートから削除しました",
      messageSaved: "メッセージを保存しました",
      confirmClear: "カートを空にしてよろしいですか？",
    },
  };
  const tr = (key: string) => i18n[lang]?.[key] || i18n["en"][key] || key;

  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  const fetchCart = useCallback(async () => {
    try {
      const res = await api.getCart();
      if (res.success && res.data) {
        setCart(res.data);
      } else {
        setCart(null);
      }
    } catch (error) {
      console.error("Failed to fetch cart:", error);
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, authLoading, lang, fetchCart, router]);

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1 || quantity > 5) return;
    setUpdating(itemId);
    try {
      const res = await api.updateCartItem(itemId, { quantity });
      if (res.success && res.data) {
        setCart(res.data as CartData);
        toast.success(tr("quantityUpdated"));
      } else {
        toast.error(res.error?.message || "Failed to update quantity");
      }
    } catch {
      toast.error("Failed to update quantity");
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setUpdating(itemId);
    try {
      const res = await api.removeCartItem(itemId);
      if (res.success && res.data) {
        setCart(res.data as CartData);
        toast.success(tr("itemRemoved"));
      } else {
        toast.error(res.error?.message || "Failed to remove item");
      }
    } catch {
      toast.error("Failed to remove item");
    } finally {
      setUpdating(null);
    }
  };

  const handleSaveMessage = async (itemId: string) => {
    const message = messages[itemId] || "";
    setUpdating(itemId);
    try {
      const res = await api.updateCartItem(itemId, { buyerMessage: message });
      if (res.success && res.data) {
        setCart(res.data as CartData);
        toast.success(tr("messageSaved"));
      } else {
        toast.error(res.error?.message || "Failed to save message");
      }
    } catch {
      toast.error("Failed to save message");
    } finally {
      setUpdating(null);
    }
  };

  const handleClearCart = async () => {
    if (!confirm(tr("confirmClear"))) return;
    setLoading(true);
    try {
      const res = await api.clearCart();
      if (res.success) {
        setCart(null);
        toast.success(tr("shoppingCart") + " cleared");
      } else {
        toast.error(res.error?.message || "Failed to clear cart");
      }
    } catch {
      toast.error("Failed to clear cart");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">{tr("shoppingCart")}</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex gap-4">
                <Skeleton className="w-24 h-24 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="w-20 h-8" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-2xl font-bold mb-2">{tr("yourCartIsEmpty")}</h1>
        <p className="text-muted-foreground mb-8">{tr("startShopping")}</p>
        <Link href={`/${lang}/products`}>
          <Button>{tr("browseProducts")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* 全局 Header */}
      <Header />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">{tr("shoppingCart")}</h1>
          <Button variant="outline" size="sm" onClick={handleClearCart}>
            {tr("clearAll")}
          </Button>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-6">
          {cart.groupedBySeller.map((group) => (
            <Card key={group.seller.id || "unknown"} className="p-4">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                <div className="font-medium">
                  {group.seller.name || tr("unknownSeller")}
                </div>
              </div>

              <div className="space-y-4">
                {group.items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    {/* Product Image */}
                    <Link href={`/${lang}/products/${item.product.id}`}>
                      {item.product.coverImage ? (
                        <Image
                          src={item.product.coverImage}
                          alt={item.product.title}
                          width={80}
                          height={80}
                          className="w-20 h-20 object-cover rounded border"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs">
                          {tr("noImage")}
                        </div>
                      )}
                    </Link>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/${lang}/products/${item.product.id}`}
                            className="font-medium text-sm line-clamp-2 hover:text-primary"
                          >
                            {item.product.title}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              className={`${PLATFORM_COLORS[item.product.platform] || "bg-gray-500"} text-white text-xs`}
                            >
                              {PLATFORM_NAMES[item.product.platform] || item.product.platform}
                            </Badge>
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              handleUpdateQuantity(item.id, item.quantity - 1)
                            }
                            disabled={updating === item.id || item.quantity <= 1}
                          >
                            -
                          </Button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              handleUpdateQuantity(item.id, item.quantity + 1)
                            }
                            disabled={updating === item.id || item.quantity >= 5}
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      {/* Options */}
                      {item.options && Object.keys(item.options).length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {(item.options as any).gift_wrap && <span>{tr("giftWrap")}</span>}
                        </div>
                      )}

                      {/* Buyer Message */}
                      <div className="mt-2 flex gap-2">
                        <Input
                          placeholder={tr("messageForSeller")}
                          value={messages[item.id] ?? item.buyerMessage ?? ""}
                          onChange={(e) =>
                            setMessages((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          className="text-xs h-8"
                          maxLength={200}
                        />
                        {(messages[item.id] !== item.buyerMessage) && (
                          <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => handleSaveMessage(item.id)}>
                            {tr("save")}
                          </Button>
                        )}
                      </div>

                      {/* Price Row */}
                      <div className="flex items-center justify-between mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-500 hover:text-red-600 h-6 p-0"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={updating === item.id}
                        >
                          {tr("remove")}
                        </Button>
                        <div className="text-sm">
                          <span className="text-muted-foreground line-through mr-2">
                            ¥{item.unitPriceJpy.toLocaleString()}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(item.subtotalCny, "CNY")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Seller Subtotal */}
              <div className="mt-4 pt-3 border-t flex justify-end">
                <div className="text-sm">
                  {tr("subtotal")}: <span className="font-medium">¥{Math.round(group.subtotal).toLocaleString()}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <Card className="p-4 sticky top-4">
            <h2 className="font-semibold mb-4">{tr("orderSummary")}</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tr("items")} ({cart.summary.totalItems})</span>
                <span>{formatCurrency(cart.summary.subtotalCny, "CNY")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tr("subtotalJpy")}</span>
                <span>¥{Math.round(cart.summary.subtotalJpy).toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tr("estimatedShipping")}</span>
                <span>{formatCurrency(cart.summary.estimatedShippingCny, "CNY")}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>{tr("total")}</span>
                <span>{formatCurrency(cart.summary.totalCny, "CNY")}</span>
              </div>
            </div>

            <Button
              className="w-full mt-4"
              size="lg"
              onClick={() => router.push(`/${lang}/checkout`)}
            >
              {tr("proceedToCheckout")}
            </Button>

            <p className="text-xs text-muted-foreground mt-3 text-center">
              {tr("shippingFinalized")}
            </p>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}
