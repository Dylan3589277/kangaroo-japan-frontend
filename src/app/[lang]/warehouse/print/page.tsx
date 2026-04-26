"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface PrintTask {
  id: string;
  orderNo: string;
  type: "label" | "waybill";
  status: "pending" | "printing" | "completed" | "failed";
  createdAt: string;
  retryCount?: number;
}

interface PrintTasksData {
  list: PrintTask[];
  total: number;
  totalPages: number;
}

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "待打印",
  printing: "打印中",
  completed: "已完成",
  failed: "失败",
};

const TASK_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500",
  printing: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
};

const TASK_TYPE_LABELS: Record<string, string> = {
  label: "标签",
  waybill: "面单",
};

export default function PrintPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [tasks, setTasks] = useState<PrintTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // BT Printer Config Dialog
  const [showBtDialog, setShowBtDialog] = useState(false);
  const [btDeviceName, setBtDeviceName] = useState("");
  const [btDeviceAddress, setBtDeviceAddress] = useState("");
  const [btPaired, setBtPaired] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.request<PrintTasksData>("/stores/printTasks", {
        method: "POST",
        body: { page, limit: 10 },
      });
      if (res.success && res.data) {
        const data = res.data;
        setTasks(data.list || []);
        setTotalPages(data.totalPages || 1);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error("Failed to fetch print tasks:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      fetchTasks();
    }
  }, [isAuthenticated, authLoading, lang, fetchTasks]);

  const handlePrint = async (task: PrintTask) => {
    try {
      const res = await api.request("/stores/printTask", {
        method: "POST",
        body: { taskId: task.id },
      });
      if (res.success) {
        toast.success(`${TASK_TYPE_LABELS[task.type]}打印已发送`);
        fetchTasks();
      } else {
        toast.error(res.error?.message || "打印失败");
      }
    } catch {
      toast.error("打印请求失败，请重试");
    }
  };

  const handleBtPair = async () => {
    if (!btDeviceName.trim() || !btDeviceAddress.trim()) {
      toast.error("请输入蓝牙打印机名称和地址");
      return;
    }
    try {
      const res = await api.request("/stores/pairPrinter", {
        method: "POST",
        body: { name: btDeviceName.trim(), address: btDeviceAddress.trim() },
      });
      if (res.success) {
        setBtPaired(true);
        toast.success("蓝牙打印机配对成功");
      } else {
        toast.error(res.error?.message || "配对失败");
      }
    } catch {
      toast.error("蓝牙配对失败，请重试");
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full mb-3 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🔐</div>
        <h1 className="text-2xl font-bold mb-2">请先登录</h1>
        <Link href={`/${lang}/login`}>
          <Button className="bg-rose-600 hover:bg-rose-700">去登录</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/${lang}/warehouse`}
          className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
        >
          ← 返回仓库首页
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">自助打印</h1>
            <p className="text-sm text-muted-foreground">
              打印标签和面单，管理打印任务
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowBtDialog(true)}
            className="flex items-center gap-2"
          >
            <span>🖨️</span>
            <span>蓝牙打印机</span>
          </Button>
        </div>
      </div>

      {/* Print Tasks */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🖨️</div>
          <h2 className="text-lg font-semibold mb-1">暂无打印任务</h2>
          <p className="text-sm text-muted-foreground mb-6">
            当你创建入库订单或出库申请时，打印任务会自动生成
          </p>
          <Link href={`/${lang}/warehouse/instore`}>
            <Button variant="outline">去入库</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {tasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono font-medium">
                          #{task.orderNo}
                        </span>
                        <Badge
                          className={`${
                            TASK_STATUS_COLORS[task.status] || "bg-gray-500"
                          } text-white text-xs`}
                        >
                          {TASK_STATUS_LABELS[task.status] || task.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {TASK_TYPE_LABELS[task.type] || task.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>创建于: {formatDate(task.createdAt)}</span>
                        {task.retryCount !== undefined && task.retryCount > 0 && (
                          <span>重试: {task.retryCount}次</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={task.status === "completed"}
                      onClick={() => handlePrint(task)}
                      className="ml-4"
                    >
                      {task.status === "completed" ? "已打印" : "打印"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {page} / {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}

      {/* Bluetooth Printer Config Dialog */}
      <Dialog open={showBtDialog} onOpenChange={setShowBtDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>蓝牙打印机配置</DialogTitle>
            <DialogDescription>
              设置蓝牙打印机连接参数
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">打印机名称</label>
              <Input
                placeholder="输入蓝牙打印机名称"
                value={btDeviceName}
                onChange={(e) => setBtDeviceName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">蓝牙地址</label>
              <Input
                placeholder="输入蓝牙MAC地址 (如 00:11:22:33:44:55)"
                value={btDeviceAddress}
                onChange={(e) => setBtDeviceAddress(e.target.value)}
              />
            </div>

            {btPaired && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                ✅ 蓝牙打印机已配对
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBtDialog(false)}>
              关闭
            </Button>
            <Button
              onClick={handleBtPair}
              className="bg-blue-600 hover:bg-blue-700"
            >
              配对
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
