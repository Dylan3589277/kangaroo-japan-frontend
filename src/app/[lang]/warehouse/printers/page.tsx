"use client";

import { loginPathWithNext } from "@/lib/login-redirect";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { isDevelopmentRuntime } from "@/lib/runtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  bluetooth: "Bluetooth",
  network: "Network",
  usb: "USB",
};

const PRINTER_STATUS_COLORS: Record<string, string> = {
  online: "bg-green-500",
  offline: "bg-gray-500",
  busy: "bg-yellow-500",
};

const PRINTER_TYPE_ICONS: Record<string, string> = {
  bluetooth: "BT",
  network: "NET",
  usb: "USB",
};

// Local-only printer fixtures. Production never treats these as real devices.
const LOCAL_PRINTER_FIXTURES: Printer[] = [
  {
    id: "local-fixture-1",
    name: "Brother QL-810W",
    address: "192.168.1.100",
    type: "network",
    status: "online",
    connected: false,
  },
  {
    id: "local-fixture-2",
    name: "EPSON TM-T88VII",
    address: "192.168.1.101",
    type: "network",
    status: "online",
    connected: true,
  },
  {
    id: "local-fixture-3",
    name: "XPRINTER 365B",
    address: "00:11:22:33:44:55",
    type: "bluetooth",
    status: "offline",
    connected: false,
  },
  {
    id: "local-fixture-4",
    name: "Zebra GK420d",
    address: "USB001",
    type: "usb",
    status: "busy",
    connected: false,
  },
  {
    id: "local-fixture-5",
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
  const t = useTranslations("warehouse");
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const statusLabel = (status: string) =>
    status === "online"
      ? t("statusOnline")
      : status === "offline"
        ? t("statusOffline")
        : status === "busy"
          ? t("statusBusy")
          : status;

  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(loginPathWithNext(lang));
      return;
    }
    if (isAuthenticated) {
      fetchPrinters();
    }
  }, [isAuthenticated, authLoading, lang, router]);

  const fetchPrinters = async () => {
    setLoading(true);
    try {
      const res = await api.request<{ list: Printer[] }>("/stores/findprinter", {
        method: "POST",
      });
      if (res.success && res.data?.list) {
        setPrinters(res.data.list);
      } else if (isDevelopmentRuntime) {
        setPrinters(LOCAL_PRINTER_FIXTURES);
      } else {
        setPrinters([]);
      }
    } catch (error) {
      console.error("Failed to fetch printers:", error);
      setPrinters(isDevelopmentRuntime ? LOCAL_PRINTER_FIXTURES : []);
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
        toast.success(t("foundPrinters", { count: res.data.list.length }));
      } else if (isDevelopmentRuntime) {
        setPrinters(LOCAL_PRINTER_FIXTURES);
        toast.warning(t("devFixtureWarning"));
      } else {
        setPrinters([]);
        toast.error(t("searchFailed"));
      }
    } catch (error) {
      console.error("Failed to search printers:", error);
      if (isDevelopmentRuntime) {
        setPrinters(LOCAL_PRINTER_FIXTURES);
        toast.warning(t("devFixtureWarning"));
      } else {
        setPrinters([]);
        toast.error(t("searchFailed"));
      }
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
        toast.success(t("connectedTo", { name: printer.name }));
        setPrinters((prev) =>
          prev.map((p) =>
            p.id === printer.id ? { ...p, connected: true, status: "online" } : p
          )
        );
      } else if (isDevelopmentRuntime && printer.id.startsWith("local-fixture-")) {
        setPrinters((prev) =>
          prev.map((p) =>
            p.id === printer.id ? { ...p, connected: true, status: "online" } : p
          )
        );
        toast.warning(t("devFixtureWarning"));
      } else {
        toast.error(t("connectFailed"));
      }
    } catch (error) {
      console.error("Failed to connect printer:", error);
      if (isDevelopmentRuntime && printer.id.startsWith("local-fixture-")) {
        setPrinters((prev) =>
          prev.map((p) =>
            p.id === printer.id ? { ...p, connected: true, status: "online" } : p
          )
        );
        toast.warning(t("devFixtureWarning"));
      } else {
        toast.error(t("connectFailed"));
      }
    }
  };

  const handleDisconnect = async (printer: Printer) => {
    try {
      const res = await api.request("/stores/disconnectPrinter", {
        method: "POST",
        body: { printerId: printer.id },
      });
      if (res.success) {
        toast.success(t("disconnectedFrom", { name: printer.name }));
        setPrinters((prev) =>
          prev.map((p) =>
            p.id === printer.id ? { ...p, connected: false } : p
          )
        );
      } else if (isDevelopmentRuntime && printer.id.startsWith("local-fixture-")) {
        setPrinters((prev) =>
          prev.map((p) =>
            p.id === printer.id ? { ...p, connected: false } : p
          )
        );
        toast.warning(t("devFixtureWarning"));
      } else {
        toast.error(t("disconnectFailed"));
      }
    } catch (error) {
      console.error("Failed to disconnect printer:", error);
      if (isDevelopmentRuntime && printer.id.startsWith("local-fixture-")) {
        setPrinters((prev) =>
          prev.map((p) =>
            p.id === printer.id ? { ...p, connected: false } : p
          )
        );
        toast.warning(t("devFixtureWarning"));
      } else {
        toast.error(t("disconnectFailed"));
      }
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
        <div className="text-6xl mb-4">!</div>
        <h1 className="text-2xl font-bold mb-2">{t("needLogin")}</h1>
        <Link href={`/${lang}/login`}>
          <Button className="bg-rose-600 hover:bg-rose-700">{t("goLogin")}</Button>
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
          {t("backHome")}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("printersTitle")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("printersDesc")}
            </p>
          </div>
          <Button
            onClick={handleSearchPrinters}
            disabled={searching}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {searching ? t("searchingPrinters") : t("searchPrinters")}
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
          <div className="text-5xl mb-4">--</div>
          <h2 className="text-lg font-semibold mb-1">{t("noPrinters")}</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {t("noPrintersDesc")}
          </p>
          <Button
            onClick={handleSearchPrinters}
            disabled={searching}
            variant="outline"
          >
            {searching ? t("searchingPrinters") : t("searchPrinters")}
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
                      {PRINTER_TYPE_ICONS[printer.type] || "PRN"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">
                          {printer.name}
                        </span>
                        {printer.connected && (
                          <Badge className="bg-green-600 text-white text-xs">
                            {t("connected")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Badge
                          className={`${
                            PRINTER_STATUS_COLORS[printer.status] || "bg-gray-500"
                          } text-white text-xs`}
                        >
                          {statusLabel(printer.status)}
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
                        {t("disconnect")}
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
                        {printer.status === "offline" ? t("offline") : t("connect")}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Summary */}
          <div className="text-center text-xs text-muted-foreground pt-2">
            {t("summary", {
              total: printers.length,
              connected: printers.filter((p) => p.connected).length,
              online: printers.filter((p) => p.status === "online").length,
            })}
          </div>
        </div>
      )}
    </div>
  );
}
