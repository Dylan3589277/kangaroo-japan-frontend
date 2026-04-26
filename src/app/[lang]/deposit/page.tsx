"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface DepositBalance {
  balance: number;
  refundingCount: number;
  tipList: string[];
}

export default function DepositPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [deposit, setDeposit] = useState<DepositBalance | null>(null);
  const [loading, setLoading] = useState(true);

  // Recharge dialog
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [recharging, setRecharging] = useState(false);

  const fetchDeposit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.request<DepositBalance>("/deposit/balance");
      if (res.success && res.data) {
        setDeposit(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch deposit:", error);
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
      fetchDeposit();
    }
  }, [isAuthenticated, authLoading, lang, fetchDeposit, router]);

  const handleRecharge = async () => {
    const amount = Number(rechargeAmount);
    if (!amount || amount <= 0) {
      toast.error("请输入有效金额");
      return;
    }

    setRecharging(true);
    try {
      const res = await api.request("/deposit/create", {
        method: "POST",
        body: { amount },
      });
      if (res.success && res.data) {
        const data = res.data as {
          depositId: string;
          orderNo: string;
          paymentNo: string;
          amount: number;
        };
        toast.success(`充值订单已创建: ¥${amount}`);
        setRechargeOpen(false);
        setRechargeAmount("");
        fetchDeposit();
        // Redirect to payment
        if (data.paymentNo) {
          router.push(`/${lang}/payment/${data.paymentNo}`);
        }
      } else {
        toast.error(res.error?.message || "充值失败");
      }
    } catch (error) {
      toast.error("充值失败，请稍后重试");
    } finally {
      setRecharging(false);
    }
  };

  const handleRefund = async () => {
    if (!confirm("确定要申请退押金吗？退押金后相关功能将受限。")) return;
    try {
      const res = await api.request("/deposit/refund", { method: "POST" });
      if (res.success) {
        toast.success("退押金申请已提交");
        fetchDeposit();
      } else {
        toast.error(res.error?.message || "退押金失败");
      }
    } catch {
      toast.error("退押金失败，请稍后重试");
    }
  };

  // Not authenticated
  if (!authLoading && !isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">押金管理</h1>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
      ) : (
        <>
          {/* Balance Card */}
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0 mb-6">
            <CardContent className="p-6">
              <p className="text-sm text-blue-100 mb-2">押金余额</p>
              <p className="text-4xl font-bold">
                ¥{deposit?.balance?.toFixed(2) ?? "0.00"}
              </p>
              {deposit?.refundingCount && deposit.refundingCount > 0 ? (
                <p className="text-xs text-blue-200 mt-2">
                  有 {deposit.refundingCount} 笔押金正在退款中
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-1 h-auto py-6"
              onClick={() => setRechargeOpen(true)}
            >
              <span className="text-2xl">💰</span>
              <span className="text-sm">充值押金</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center gap-1 h-auto py-6"
              onClick={handleRefund}
            >
              <span className="text-2xl">↩️</span>
              <span className="text-sm">申请退押金</span>
            </Button>

            <Link href={`/${lang}/deposit/history`} className="block">
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-6 w-full"
              >
                <span className="text-2xl">📋</span>
                <span className="text-sm">押金明细</span>
              </Button>
            </Link>
          </div>

          {/* Tips */}
          {deposit?.tipList && deposit.tipList.length > 0 && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-2">押金说明</h3>
                <ul className="space-y-1">
                  {deposit.tipList.map((tip, i) => (
                    <li
                      key={i}
                      className="text-xs text-muted-foreground flex items-start gap-2"
                    >
                      <span className="mt-0.5 shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Default deposit info when API has no tips */}
          {(!deposit?.tipList || deposit.tipList.length === 0) && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-2">押金说明</h3>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">•</span>
                    <span>押金可用于竞拍保证金和代购服务费抵扣</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">•</span>
                    <span>退押金后部分功能将受限</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">•</span>
                    <span>押金退还将在提交申请后3-5个工作日处理</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Recharge Dialog */}
      <Dialog open={rechargeOpen} onOpenChange={setRechargeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>充值押金</DialogTitle>
            <DialogDescription>
              请输入充值金额，最低充值 100 元
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                ¥
              </span>
              <Input
                type="number"
                placeholder="请输入金额"
                className="pl-8 text-lg"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                min={1}
              />
            </div>
            <div className="flex gap-2 mt-3">
              {[100, 200, 500, 1000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setRechargeAmount(String(amount))}
                >
                  ¥{amount}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRechargeOpen(false)}
            >
              取消
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleRecharge}
              disabled={recharging}
            >
              {recharging ? "处理中..." : "前去支付"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
