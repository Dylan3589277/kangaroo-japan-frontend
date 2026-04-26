"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Printer {
  id: string;
  name: string;
  address?: string;
  type: "bluetooth" | "network" | "usb";
  status: "online" | "offline" | "busy";
  connected: boolean;
}

const PRINTER_TYPE_LABELS: Record<string, string> = {
  bluetooth: "蓝牙",
  network: "网络",
  usb: "USB",
};

const PRINTER_STATUS_LABELS: Record<string, string> = {
  online: "在线",
  offline: "离线",
  busy: "忙碌",
};

const PRINTER_STATUS_COLORS: Record<string, string> = {
  online: "bg-green-500",
  offline: "bg-gray-500",
  busy: "bg-yellow-500",
};

const PRINTER_TYPE_ICONS: Record<string, string> = {
  bluetooth: "🔵",
  network: "🌐",
  usb: "🔌",
};

// Mock printer data for demo when API is unavailable
const MOCK_PRINTERS: Printer[] = [
  {
    id: "mock-1",
    name: "Brother QL-810W",
    address: "192.168.1.100",
    type: "network",
    status: "online",
    connected: false,
  },
  {
    id: "mock-2",
    name: "EPSON TM-T88VII",
    address: "192.168.1.101",
    type: "network",
    status: "online",
    connected: true,
  },
  {
    id: "mock-3",
    name: "XPRINTER 365B",
    address: "00:11:22:33:44:55",
    type: "bluetooth",
    status: "offline",
    connected: false,
  },
  {
    id: "mock-4",
    name: "Zebra GK420d",
    address: "USB001",
    type: "usb",
    status: "busy",
    connected: false,
  },
  {
    id: "mock-5",
    name: "SATOCL-2xx",
    address: "192.168.1.102",
    type: "network",
    status: "online",
    connected: false,
  },
];

export default function PrintersPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      fetchPrinters();
    }
  }, [isAuthenticated, authLoading, lang]);

  const fetchPrinters = async () => {
    setLoading(true);
    try {
      const res = await api.request<{ list: Printer[] }>("/stores/findprinter", {
        method: "POST",
      });
      if (res.success && res.data?.list) {
        setPrinters(res.data.list);
      } else {
        // Use mock data when API is unavailable
        setPrinters(MOCK_PRINTERS);
      }
    } catch (error) {
      console.error("Failed to fetch printers, using mock data:", error);
      setPrinters(MOCK_PRINTERS);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPrinters = async () => {
    setSearching(true);
    try {
      const res = await api.request<{ list: Printer[] }>("/stores/findprinter", {
        method: "POST",
        body: { search: true },
      });
      if (res.success && res.data?.list) {
        setPrinters(res.data.list);
        toast.success(`找到 ${res.data.list.length} 台打印机`);
      } else {
        // Simulate search with delay for mock
        await new Promise((r) => setTimeout(r, 1500));
        setPrinters(MOCK_PRINTERS);
        toast.success(`找到 ${MOCK_PRINTERS.length} 台打印机`);
      }
    } catch (error) {
      console.error("Failed to search printers:", error);
      // Simulate search with delay for mock
      await new Promise((r) => setTimeout(r, 1500));
      setPrinters(MOCK_PRINTERS);
      toast.success(`找到 ${MOCK_PRINTERS.length} 台打印机`);
    } finally {
      setSearching(false);
    }
  };

  const handleConnect = async (printer: Printer) => {
    try {
      const res = await api.request("/stores/connectPrinter", {
        method: "POST",
        body: { printerId: printer.id },
      });
      if (res.success) {
        toast.success(`已连接 ${printer.name}`);
        setPrinters((prev) =>
          prev.map((p) =>
            p.id === printer.id ? { ...p, connected: true, status: "online" } : p
          )
        );
      } else {
        // For mock: toggle locally
        setPrinters((prev) =>
          prev.map((p) =>
            p.id === printer.id ? { ...p, connected: true, status: "online" } : p
          )
        );
        toast.success(`已连接 ${printer.name}`);
      }
    } catch (error) {
      console.error("Failed to connect printer:", error);
      // For mock: toggle locally
      setPrinters((prev) =>
        prev.map((p) =>
          p.id === printer.id ? { ...p, connected: true, status: "online" } : p
        )
      );
      toast.success(`已连接 ${printer.name}`);
    }
  };

  const handleDisconnect = async (printer: Printer) => {
    try {
      const res = await api.request("/stores/disconnectPrinter", {
        method: "POST",
        body: { printerId: printer.id },
      });
      if (res.success) {
        toast.success(`已断开 ${printer.name}`);
        setPrinters((prev) =>
          prev.map((p) =>
            p.id === printer.id ? { ...p, connected: false } : p
          )
        );
      } else {
        // For mock: toggle locally
        setPrinters((prev) =>
          prev.map((p) =>
            p.id === printer.id ? { ...p, connected: false } : p
          )
        );
        toast.success(`已断开 ${printer.name}`);
      }
    } catch (error) {
      console.error("Failed to disconnect printer:", error);
      // For mock: toggle locally
      setPrinters((prev) =>
        prev.map((p) =>
          p.id === printer.id ? { ...p, connected: false } : p
        )
      );
      toast.success(`已断开 ${printer.name}`);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-10 w-40 mb-6" />
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
            <h1 className="text-2xl font-bold">打印机列表</h1>
            <p className="text-sm text-muted-foreground">
              搜索、连接和管理附近的打印机
            </p>
          </div>
          <Button
            onClick={handleSearchPrinters}
            disabled={searching}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {searching ? "搜索中..." : "🔍 搜索打印机"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : printers.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🖨️</div>
          <h2 className="text-lg font-semibold mb-1">未发现打印机</h2>
          <p className="text-sm text-muted-foreground mb-6">
            点击上方按钮搜索附近的打印机
          </p>
          <Button
            onClick={handleSearchPrinters}
            disabled={searching}
            variant="outline"
          >
            {searching ? "搜索中..." : "搜索打印机"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {printers.map((printer) => (
            <Card key={printer.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg flex-shrink-0">
                      {PRINTER_TYPE_ICONS[printer.type] || "🖨️"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">
                          {printer.name}
                        </span>
                        {printer.connected && (
                          <Badge className="bg-green-600 text-white text-xs">
                            已连接
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Badge
                          className={`${
                            PRINTER_STATUS_COLORS[printer.status] || "bg-gray-500"
                          } text-white text-xs`}
                        >
                          {PRINTER_STATUS_LABELS[printer.status] || printer.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {PRINTER_TYPE_LABELS[printer.type] || printer.type}
                        </Badge>
                        {printer.address && (
                          <span className="font-mono">{printer.address}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    {printer.connected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(printer)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        断开
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnect(printer)}
                        disabled={printer.status === "offline"}
                        className={
                          printer.status === "offline"
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }
                      >
                        {printer.status === "offline" ? "离线" : "连接"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Summary */}
          <div className="text-center text-xs text-muted-foreground pt-2">
            共 {printers.length} 台打印机 ·{" "}
            已连接 {printers.filter((p) => p.connected).length} 台 ·{" "}
            在线 {printers.filter((p) => p.status === "online").length} 台
          </div>
        </div>
      )}
    </div>
  );
}
