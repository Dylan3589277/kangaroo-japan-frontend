"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function DaipayPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [orderNo, setOrderNo] = useState("");
  const [generating, setGenerating] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const getTitle = () => {
    const titles: Record<string, string> = {
      zh: "好友代付",
      en: "Friend Payment",
      ja: "友達代払い",
    };
    return titles[lang] || titles.zh;
  };

  const getOrderLabel = () => {
    const labels: Record<string, string> = {
      zh: "订单号",
      en: "Order No.",
      ja: "注文番号",
    };
    return labels[lang] || labels.zh;
  };

  const getOrderPlaceholder = () => {
    const labels: Record<string, string> = {
      zh: "请输入要代付的订单号",
      en: "Enter the order number to pay for",
      ja: "代払いする注文番号を入力",
    };
    return labels[lang] || labels.zh;
  };

  const getGenerateBtn = () => {
    if (generating) {
      const labels: Record<string, string> = {
        zh: "生成中...",
        en: "Generating...",
        ja: "生成中...",
      };
      return labels[lang] || labels.zh;
    }
    const labels: Record<string, string> = {
      zh: "生成代付链接",
      en: "Generate Payment Link",
      ja: "代払いリンクを生成",
    };
    return labels[lang] || labels.zh;
  };

  const getCopyLink = () => {
    const labels: Record<string, string> = {
      zh: "复制链接",
      en: "Copy Link",
      ja: "リンクをコピー",
    };
    return labels[lang] || labels.zh;
  };

  const getCopied = () => {
    const labels: Record<string, string> = {
      zh: "已复制",
      en: "Copied",
      ja: "コピーしました",
    };
    return labels[lang] || labels.zh;
  };

  const getInstructionTitle = () => {
    const labels: Record<string, string> = {
      zh: "代付说明",
      en: "Instructions",
      ja: "代払い説明",
    };
    return labels[lang] || labels.zh;
  };

  const handleGenerate = async () => {
    if (!orderNo.trim()) {
      toast.error(
        lang === "zh"
          ? "请输入订单号"
          : lang === "ja"
          ? "注文番号を入力してください"
          : "Please enter an order number"
      );
      inputRef.current?.focus();
      return;
    }

    setGenerating(true);
    try {
      const res = await api.request<{ payment_url: string; qrcode?: string }>(
        "/pay/daipay",
        {
          method: "POST",
          body: { order_no: orderNo.trim() },
        }
      );

      if (res.success && res.data) {
        const link = res.data.payment_url || `${window.location.origin}/${lang}/pay/daipay?order=${orderNo.trim()}`;
        setPaymentLink(link);
        setShowDialog(true);
        toast.success(
          lang === "zh"
            ? "代付链接已生成"
            : lang === "ja"
            ? "代払いリンクを生成しました"
            : "Payment link generated"
        );
      } else {
        // Fallback: generate a simulated link
        const link = `${window.location.origin}/${lang}/pay/daipay?order=${orderNo.trim()}`;
        setPaymentLink(link);
        setShowDialog(true);
        toast.success(
          lang === "zh"
            ? "代付链接已生成（模拟）"
            : lang === "ja"
            ? "代払いリンクを生成しました（模擬）"
            : "Payment link generated (simulated)"
        );
      }
    } catch {
      // Fallback on error
      const link = `${window.location.origin}/${lang}/pay/daipay?order=${orderNo.trim()}`;
      setPaymentLink(link);
      setShowDialog(true);
      toast.success(
        lang === "zh"
          ? "代付链接已生成（模拟）"
          : "Payment link generated (simulated)"
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!paymentLink) return;
    try {
      await navigator.clipboard.writeText(paymentLink);
      toast.success(getCopied());
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = paymentLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success(getCopied());
    }
  };

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-lg">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-200 rounded-xl" />
          <div className="h-32 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <div className="text-6xl mb-4">🔐</div>
        <h1 className="text-2xl font-bold mb-2">
          {lang === "zh" ? "请先登录" : lang === "ja" ? "ログインしてください" : "Please log in"}
        </h1>
        <p className="text-muted-foreground mb-6">
          {lang === "zh"
            ? "登录后即可使用好友代付功能"
            : lang === "ja"
            ? "ログイン後、友達代払い機能をご利用いただけます"
            : "Log in to use the friend payment feature"}
        </p>
        <Button
          className="bg-rose-600 hover:bg-rose-700"
          onClick={() => router.push(`/${lang}/login`)}
        >
          {lang === "zh" ? "去登录" : lang === "ja" ? "ログイン" : "Log In"}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">{getTitle()}</h1>

      {/* Input Order */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <label className="block text-sm font-medium mb-2">
            {getOrderLabel()}
          </label>
          <Input
            ref={inputRef}
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            placeholder={getOrderPlaceholder()}
            className="mb-4"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleGenerate();
            }}
          />
          <Button
            className="w-full bg-rose-600 hover:bg-rose-700"
            disabled={generating || !orderNo.trim()}
            onClick={handleGenerate}
          >
            {getGenerateBtn()}
          </Button>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{getInstructionTitle()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {lang === "zh" ? (
            <>
              <div className="flex items-start gap-2">
                <Badge className="bg-rose-100 text-rose-600 border-0 flex-shrink-0 mt-0.5">1</Badge>
                <span>输入需要代付的订单号</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-rose-100 text-rose-600 border-0 flex-shrink-0 mt-0.5">2</Badge>
                <span>点击&ldquo;生成代付链接&rdquo;按钮</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-rose-100 text-rose-600 border-0 flex-shrink-0 mt-0.5">3</Badge>
                <span>将生成的链接发送给好友</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-rose-100 text-rose-600 border-0 flex-shrink-0 mt-0.5">4</Badge>
                <span>好友打开链接即可代为支付</span>
              </div>
            </>
          ) : lang === "ja" ? (
            <>
              <div className="flex items-start gap-2">
                <Badge className="bg-rose-100 text-rose-600 border-0 flex-shrink-0 mt-0.5">1</Badge>
                <span>代払いする注文番号を入力</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-rose-100 text-rose-600 border-0 flex-shrink-0 mt-0.5">2</Badge>
                <span>&ldquo;代払いリンクを生成&rdquo;をクリック</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-rose-100 text-rose-600 border-0 flex-shrink-0 mt-0.5">3</Badge>
                <span>生成されたリンクを友達に送信</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-rose-100 text-rose-600 border-0 flex-shrink-0 mt-0.5">4</Badge>
                <span>友達がリンクを開いて代払い</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <Badge className="bg-rose-100 text-rose-600 border-0 flex-shrink-0 mt-0.5">1</Badge>
                <span>Enter the order number to be paid</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-rose-100 text-rose-600 border-0 flex-shrink-0 mt-0.5">2</Badge>
                <span>Click &ldquo;Generate Payment Link&rdquo;</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-rose-100 text-rose-600 border-0 flex-shrink-0 mt-0.5">3</Badge>
                <span>Share the link with your friend</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge className="bg-rose-100 text-rose-600 border-0 flex-shrink-0 mt-0.5">4</Badge>
                <span>Friend opens the link and pays</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Link Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {lang === "zh"
                ? "代付链接"
                : lang === "ja"
                ? "代払いリンク"
                : "Payment Link"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* QR Code placeholder */}
            <div className="flex justify-center">
              <div className="w-48 h-48 bg-gradient-to-br from-rose-100 to-orange-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-rose-300">
                <div className="text-center">
                  <span className="text-5xl">📱</span>
                  <p className="text-xs text-muted-foreground mt-2">
                    {lang === "zh"
                      ? "二维码区域"
                      : lang === "ja"
                      ? "QRコードエリア"
                      : "QR Code Area"}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment link */}
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">
                {lang === "zh"
                  ? "代付链接"
                  : lang === "ja"
                  ? "代払いリンク"
                  : "Payment Link"}
              </p>
              <p className="text-sm font-mono break-all">{paymentLink}</p>
            </div>

            <Button
              className="w-full bg-rose-600 hover:bg-rose-700"
              onClick={handleCopyLink}
            >
              {getCopyLink()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
