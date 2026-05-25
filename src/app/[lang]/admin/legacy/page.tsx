"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Bot,
  ClipboardList,
  Coins,
  FileText,
  Gift,
  RefreshCw,
  ShieldCheck,
  Star,
  UserCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  api,
  type AdminLegacyConfigItem,
  type AdminLegacyMercariDpopItem,
  type AdminLegacyYahooAccountItem,
  type AdminListResponse,
  type AdminMiniProgramFeatureStatus,
  type AdminMiniProgramSummary,
} from "@/lib/api";

type BoolFilter = "all" | "true" | "false";

interface ListState<T> {
  data: T[];
  pagination?: AdminListResponse<T>["pagination"];
}

const DEFAULT_YAHOO_FILTER = {
  q: "",
  loginStatus: "all" as BoolFilter,
  hasCookies: "all" as BoolFilter,
  isDeleted: "false" as BoolFilter,
};

const DEFAULT_MERCARI_FILTER = {
  type: "",
  hasDpop: "all" as BoolFilter,
};

const DEFAULT_CONFIG_FILTER = {
  q: "",
  isSensitive: "all" as BoolFilter,
  robotOnly: true,
};

const LEGACY_CLOSURE_ROWS = [
  {
    domain: "Admin / RBAC",
    evidence: "st_member 16, st_roles 2, st_menu 138",
    legacy: "st_member.rid, st_member.order_cats, st_roles, st_menu",
    modern: "users.admin_* + AdminPermissionGuard",
    status: "partial",
    risk: "high",
    next: "Import into staging, then replace compatibility full access with strict role/menu permissions.",
  },
  {
    domain: "Order category scope",
    evidence: "Preview verified: 50 modern fixtures, 1292 allowed / 1293 denied",
    legacy: "st_orders.cat + st_member.order_cats",
    modern: "orders.legacy_order_category_id + operation guards",
    status: "preview_verified",
    risk: "high",
    next: "Continue strict role/menu migration before production role rollout.",
  },
  {
    domain: "Orders / cart",
    evidence: "Orders.php + Carts.php contract scanned",
    legacy: "submit/detail/mine/cancel/shipments/addcart/delcart/submit",
    modern: "orders, cart, legacy adapters, admin workflows",
    status: "partial",
    risk: "high",
    next: "Lock read/write contracts before opening new write adapters.",
  },
  {
    domain: "Warehouse",
    evidence: "Stores.php + ShipOrders.php contract scanned",
    legacy: "instore/cancelstore/confirm/doship/print/photos",
    modern: "warehouse_operation_history + admin audit",
    status: "partial",
    risk: "high",
    next: "Map legacy shipment states to modern exception/manual handling states.",
  },
  {
    domain: "Refund / payment / deposit",
    evidence: "Pay.php + Users.refund/recharge contract scanned",
    legacy: "daipay/payDeposit/dopay/notify/refund/refundhistory",
    modern: "payments, refund approvals, deposit",
    status: "partial",
    risk: "high",
    next: "Separate approval, provider execution, webhook idempotency, and compensation states.",
  },
  {
    domain: "Support",
    evidence: "Chat.php + Consults.php + OrderConsults.php scanned",
    legacy: "send/lists/cancel/getkefu/parseurl/goods",
    modern: "support tickets + Hermes draft + audit",
    status: "partial",
    risk: "high",
    next: "Keep knowledge-only drafts, own-order scope, manual review before send.",
  },
  {
    domain: "Articles / help",
    evidence: "Preview verified: st_articles 49, visible 45",
    legacy: "st_articles + Articles.php",
    modern: "articles module + frontend article pages",
    status: "preview_verified",
    risk: "medium",
    next: "Keep DB-backed adapter as source; remove only dev/demo fallback from production paths.",
  },
  {
    domain: "Platform robot",
    evidence: "Preview verified: Yahoo 3, Mercari DPoP 59,187, st_config 6",
    legacy: "st_yahoo_accounts, mercari_dpops, configs",
    modern: "admin mini-program read-only status",
    status: "preview_verified",
    risk: "high",
    next: "Keep redacted; never expose cookies, passwords, DPoP, or config secrets.",
  },
  {
    domain: "Platform detail / smoke",
    evidence: "Yahoo Auction and Yahoo Shopping are separate providers",
    legacy: "Yahoo.php, YahooGoods.php, Amazon.php, MercariGoods.php",
    modern: "integrations detail adapters + production smoke",
    status: "partial",
    risk: "high",
    next: "Classify errors by provider, sample, credential, detail, and image failures.",
  },
] as const;

function statusBadge(status: AdminMiniProgramFeatureStatus) {
  if (status === "preview_verified") {
    return { label: "Preview verified", variant: "secondary" as const };
  }
  if (status === "admin_readonly_ready") {
    return { label: "Admin read", variant: "secondary" as const };
  }
  if (status === "migrated_user_side") {
    return { label: "User migrated", variant: "outline" as const };
  }
  if (status === "legacy_reference_only") {
    return { label: "Legacy only", variant: "destructive" as const };
  }
  return { label: "Write gap", variant: "outline" as const };
}

function metric(value?: number | null) {
  return Number(value || 0).toLocaleString("zh-CN");
}

function yesNo(value?: boolean | null) {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "-";
}

function shortDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function listCount<T>(list: ListState<T>) {
  const total = list.pagination?.total ?? list.data.length;
  return `${metric(total)} total`;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: BoolFilter;
  onChange: (value: BoolFilter) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-600">
      {label}
      <select
        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm font-normal text-slate-900"
        value={value}
        onChange={(event) => onChange(event.target.value as BoolFilter)}
      >
        <option value="all">All</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </label>
  );
}

function TextFilter({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-slate-600">
      {label}
      <input
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default function AdminLegacyMatrixPage() {
  const [summary, setSummary] = useState<AdminMiniProgramSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState("");
  const [yahooFilter, setYahooFilter] = useState(DEFAULT_YAHOO_FILTER);
  const [mercariFilter, setMercariFilter] = useState(DEFAULT_MERCARI_FILTER);
  const [configFilter, setConfigFilter] = useState(DEFAULT_CONFIG_FILTER);
  const [yahooAccounts, setYahooAccounts] = useState<
    ListState<AdminLegacyYahooAccountItem>
  >({ data: [] });
  const [mercariDpops, setMercariDpops] = useState<
    ListState<AdminLegacyMercariDpopItem>
  >({ data: [] });
  const [legacyConfigs, setLegacyConfigs] = useState<
    ListState<AdminLegacyConfigItem>
  >({ data: [] });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await api.getAdminMiniProgramSummary();
    setLoading(false);
    if (!response.success || !response.data) {
      setError(response.error?.message || "Mini-program matrix failed.");
      setSummary(null);
      return;
    }
    setSummary(response.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api.getAdminMiniProgramSummary().then((response) => {
      if (cancelled) return;
      setLoading(false);
      if (!response.success || !response.data) {
        setError(response.error?.message || "Mini-program matrix failed.");
        setSummary(null);
        return;
      }
      setSummary(response.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadDetails = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setDetailsLoading(true);
      setDetailsError("");
      const [yahooResponse, mercariResponse, configResponse] =
        await Promise.all([
          api.listAdminLegacyYahooAccounts({
            ...yahooFilter,
            page: 1,
            limit: 20,
          }),
          api.listAdminLegacyMercariDpops({
            ...mercariFilter,
            page: 1,
            limit: 20,
          }),
          api.listAdminLegacyConfigs({
            ...configFilter,
            page: 1,
            limit: 20,
          }),
        ]);

      setDetailsLoading(false);
      if (!yahooResponse.success || !yahooResponse.data) {
        setDetailsError(
          yahooResponse.error?.message || "Yahoo account list failed.",
        );
        return;
      }
      if (!mercariResponse.success || !mercariResponse.data) {
        setDetailsError(
          mercariResponse.error?.message || "Mercari DPoP list failed.",
        );
        return;
      }
      if (!configResponse.success || !configResponse.data) {
        setDetailsError(
          configResponse.error?.message || "Legacy config list failed.",
        );
        return;
      }
      setYahooAccounts(yahooResponse.data);
      setMercariDpops(mercariResponse.data);
      setLegacyConfigs(configResponse.data);
    },
    [configFilter, mercariFilter, yahooFilter],
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api.listAdminLegacyYahooAccounts({
        ...DEFAULT_YAHOO_FILTER,
        page: 1,
        limit: 20,
      }),
      api.listAdminLegacyMercariDpops({
        ...DEFAULT_MERCARI_FILTER,
        page: 1,
        limit: 20,
      }),
      api.listAdminLegacyConfigs({
        ...DEFAULT_CONFIG_FILTER,
        page: 1,
        limit: 20,
      }),
    ]).then(([yahooResponse, mercariResponse, configResponse]) => {
      if (cancelled) return;
      setDetailsLoading(false);
      if (!yahooResponse.success || !yahooResponse.data) {
        setDetailsError(
          yahooResponse.error?.message || "Yahoo account list failed.",
        );
        return;
      }
      if (!mercariResponse.success || !mercariResponse.data) {
        setDetailsError(
          mercariResponse.error?.message || "Mercari DPoP list failed.",
        );
        return;
      }
      if (!configResponse.success || !configResponse.data) {
        setDetailsError(
          configResponse.error?.message || "Legacy config list failed.",
        );
        return;
      }
      setYahooAccounts(yahooResponse.data);
      setMercariDpops(mercariResponse.data);
      setLegacyConfigs(configResponse.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(() => {
    const data = summary?.summaries;
    const robot = data?.platformAccountsRobot;
    return [
      {
        label: "Deposit / recharge",
        icon: <Coins className="h-4 w-4" />,
        lines: [
          `records ${metric(data?.deposit.totalDeposits)}`,
          `refunding ${metric(data?.deposit.refundingRequests)}`,
          `balance CNY ${metric(data?.deposit.userDepositBalance)}`,
        ],
      },
      {
        label: "Coupons / score",
        icon: <Gift className="h-4 w-4" />,
        lines: [
          `coupons ${metric(data?.couponsAndScore.enabledCoupons)}`,
          `issued ${metric(data?.couponsAndScore.issuedCoupons)}`,
          `score logs ${metric(data?.couponsAndScore.scoreLogs)}`,
        ],
      },
      {
        label: "VIP",
        icon: <Star className="h-4 w-4" />,
        lines: [
          `levels ${metric(data?.vip.levels)}`,
          `orders ${metric(data?.vip.totalOrders)}`,
          `paid ${metric(data?.vip.paidOrders)}`,
        ],
      },
      {
        label: "Sign-in",
        icon: <BadgeCheck className="h-4 w-4" />,
        lines: [
          `today ${metric(data?.sign.todayLogs)}`,
          `total ${metric(data?.sign.totalLogs)}`,
        ],
      },
      {
        label: "Articles / help",
        icon: <FileText className="h-4 w-4" />,
        lines: [
          `articles ${metric(data?.articles.articles)}`,
          `help ${metric(data?.articles.helpItems)}`,
          `source ${data?.articles.source || "-"}`,
        ],
      },
      {
        label: "Legacy admins",
        icon: <UserCheck className="h-4 w-4" />,
        lines: [
          `admins ${metric(data?.admins.admins)}`,
          `legacy ${metric(data?.admins.importedLegacyAdmins)}`,
        ],
      },
      {
        label: "Platform accounts / robot",
        icon: <Bot className="h-4 w-4" />,
        lines: [
          `Yahoo accounts ${metric(robot?.yahoo?.total)}`,
          `Yahoo logged in ${metric(robot?.yahoo?.loggedIn)}`,
          `Mercari DPoP ${metric(robot?.mercari?.total)}`,
          `Auto buy ${yesNo(robot?.robot?.autoBuyEnabled)}`,
          `Heart stale ${yesNo(robot?.robot?.heartbeatStale)}`,
        ],
      },
    ];
  }, [summary]);

  const robot = summary?.summaries.platformAccountsRobot;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Shared admin console</p>
          <h1 className="text-2xl font-semibold text-slate-900">
            DSR mini-program feature matrix
          </h1>
        </div>
        <Button onClick={() => void load()} disabled={loading} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="grid gap-1 text-sm text-slate-600">
                {card.lines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mb-6 rounded-lg border bg-white">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <ClipboardList className="h-4 w-4 text-slate-500" />
          <h2 className="font-medium">Legacy export closure matrix</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Domain</th>
                <th className="px-4 py-2 font-medium">Real export evidence</th>
                <th className="px-4 py-2 font-medium">Legacy source</th>
                <th className="px-4 py-2 font-medium">Modern target</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Risk</th>
                <th className="px-4 py-2 font-medium">Next action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {LEGACY_CLOSURE_ROWS.map((row) => (
                <tr key={row.domain}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {row.domain}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.evidence}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {row.legacy}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.modern}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        String(row.status) === "readonly_ready"
                          || String(row.status) === "preview_verified"
                          ? "secondary"
                          : String(row.status) === "blocked_by_db"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={row.risk === "high" ? "destructive" : "outline"}
                    >
                      {row.risk}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.next}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Bot className="h-4 w-4 text-slate-500" />
          <h2 className="font-medium">Platform robot read-only state</h2>
        </div>
        <div className="grid gap-4 p-4 text-sm md:grid-cols-3">
          <div>
            <div className="font-medium text-slate-900">Yahoo accounts</div>
            <div className="mt-2 grid gap-1 text-slate-600">
              <span>active {metric(robot?.yahoo?.active)}</span>
              <span>cookie ready {metric(robot?.yahoo?.cookieReady)}</span>
              <span>latest login {robot?.yahoo?.latestLoginAt || "-"}</span>
            </div>
          </div>
          <div>
            <div className="font-medium text-slate-900">Mercari DPoP</div>
            <div className="mt-2 grid gap-1 text-slate-600">
              <span>total {metric(robot?.mercari?.total)}</span>
              <span>
                missing {robot?.mercari?.missingTypes.join(", ") || "-"}
              </span>
              <span>secrets hidden {yesNo(robot?.mercari?.sensitiveFieldsHidden)}</span>
            </div>
          </div>
          <div>
            <div className="font-medium text-slate-900">Auto-buy robot</div>
            <div className="mt-2 grid gap-1 text-slate-600">
              <span>enabled {yesNo(robot?.robot?.autoBuyEnabled)}</span>
              <span>heartbeat {robot?.robot?.autoBuyHeart || "-"}</span>
              <span>
                heartbeat age {metric(robot?.robot?.heartbeatAgeMinutes)} min
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-slate-500" />
            <h2 className="font-medium">Platform accounts and robot lists</h2>
          </div>
          <Button
            onClick={() => void loadDetails()}
            disabled={detailsLoading}
            variant="outline"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Apply filters
          </Button>
        </div>

        {detailsError ? (
          <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {detailsError}
          </div>
        ) : null}

        <div className="grid gap-6 p-4">
          <div className="rounded-md border border-slate-200">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b bg-slate-50 px-4 py-3">
              <div>
                <div className="font-medium text-slate-900">
                  Yahoo platform accounts
                </div>
                <div className="text-xs text-slate-500">
                  {listCount(yahooAccounts)} / passwords and cookies are hidden
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                <TextFilter
                  label="Search"
                  value={yahooFilter.q}
                  placeholder="account / email / fingerprint"
                  onChange={(q) => setYahooFilter((prev) => ({ ...prev, q }))}
                />
                <FilterSelect
                  label="Login"
                  value={yahooFilter.loginStatus}
                  onChange={(loginStatus) =>
                    setYahooFilter((prev) => ({ ...prev, loginStatus }))
                  }
                />
                <FilterSelect
                  label="Cookies"
                  value={yahooFilter.hasCookies}
                  onChange={(hasCookies) =>
                    setYahooFilter((prev) => ({ ...prev, hasCookies }))
                  }
                />
                <FilterSelect
                  label="Deleted"
                  value={yahooFilter.isDeleted}
                  onChange={(isDeleted) =>
                    setYahooFilter((prev) => ({ ...prev, isDeleted }))
                  }
                />
              </div>
            </div>
            {yahooAccounts.data.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="border-b bg-white text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Account</th>
                      <th className="px-4 py-2 font-medium">Email</th>
                      <th className="px-4 py-2 font-medium">Login</th>
                      <th className="px-4 py-2 font-medium">Cookies</th>
                      <th className="px-4 py-2 font-medium">Cookie fingerprint</th>
                      <th className="px-4 py-2 font-medium">Last login</th>
                      <th className="px-4 py-2 font-medium">Deleted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {yahooAccounts.data.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {item.account || `#${item.id}`}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.email || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={item.loginStatus ? "secondary" : "outline"}>
                            {yesNo(item.loginStatus)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">{yesNo(item.hasCookies)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {item.cookieFingerprint || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {shortDate(item.lastLoginAt)}
                        </td>
                        <td className="px-4 py-3">{yesNo(item.isDeleted)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                message={
                  detailsLoading
                    ? "Loading Yahoo accounts..."
                    : "No Yahoo accounts matched the current filters."
                }
              />
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-md border border-slate-200">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b bg-slate-50 px-4 py-3">
                <div>
                  <div className="font-medium text-slate-900">
                    Mercari DPoP heartbeat
                  </div>
                  <div className="text-xs text-slate-500">
                    {listCount(mercariDpops)} / token values are hidden
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <TextFilter
                    label="Type"
                    value={mercariFilter.type}
                    placeholder="search / detail / profile"
                    onChange={(type) =>
                      setMercariFilter((prev) => ({ ...prev, type }))
                    }
                  />
                  <FilterSelect
                    label="DPoP"
                    value={mercariFilter.hasDpop}
                    onChange={(hasDpop) =>
                      setMercariFilter((prev) => ({ ...prev, hasDpop }))
                    }
                  />
                </div>
              </div>
              {mercariDpops.data.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="border-b bg-white text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-2 font-medium">Type</th>
                        <th className="px-4 py-2 font-medium">DPoP</th>
                        <th className="px-4 py-2 font-medium">Fingerprint</th>
                        <th className="px-4 py-2 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {mercariDpops.data.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {item.type}
                          </td>
                          <td className="px-4 py-3">{yesNo(item.hasDpop)}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            {item.dpopFingerprint || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {shortDate(item.legacyCreatedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  message={
                    detailsLoading
                      ? "Loading Mercari DPoP state..."
                      : "No Mercari DPoP records matched the current filters."
                  }
                />
              )}
            </div>

            <div className="rounded-md border border-slate-200">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b bg-slate-50 px-4 py-3">
                <div>
                  <div className="font-medium text-slate-900">
                    Config and auto-buy state
                  </div>
                  <div className="text-xs text-slate-500">
                    {listCount(legacyConfigs)} / values are previews only
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <TextFilter
                    label="Search"
                    value={configFilter.q}
                    placeholder="AUTO / TOKEN / shop"
                    onChange={(q) => setConfigFilter((prev) => ({ ...prev, q }))}
                  />
                  <FilterSelect
                    label="Sensitive"
                    value={configFilter.isSensitive}
                    onChange={(isSensitive) =>
                      setConfigFilter((prev) => ({ ...prev, isSensitive }))
                    }
                  />
                  <label className="flex items-end gap-2 pb-2 text-xs font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={configFilter.robotOnly}
                      onChange={(event) =>
                        setConfigFilter((prev) => ({
                          ...prev,
                          robotOnly: event.target.checked,
                        }))
                      }
                    />
                    Robot only
                  </label>
                </div>
              </div>
              {legacyConfigs.data.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="border-b bg-white text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-2 font-medium">Name</th>
                        <th className="px-4 py-2 font-medium">Preview</th>
                        <th className="px-4 py-2 font-medium">Kind</th>
                        <th className="px-4 py-2 font-medium">Sensitive</th>
                        <th className="px-4 py-2 font-medium">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {legacyConfigs.data.map((item) => (
                        <tr key={item.name}>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {item.name}
                          </td>
                          <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs text-slate-500">
                            {item.valuePreview || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.valueKind}
                          </td>
                          <td className="px-4 py-3">
                            {yesNo(item.isSensitive)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {shortDate(item.legacyUpdatedAt || item.updatedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  message={
                    detailsLoading
                      ? "Loading legacy config state..."
                      : "No configs matched the current filters."
                  }
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <ClipboardList className="h-4 w-4 text-slate-500" />
          <h2 className="font-medium">Migration / adaptation matrix</h2>
        </div>
        <div className="divide-y">
          {(summary?.featureMatrix || []).map((row) => {
            const badge = statusBadge(row.status);
            return (
              <div
                key={row.key}
                className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[180px_140px_1fr]"
              >
                <div>
                  <div className="font-medium text-slate-900">{row.label}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <ShieldCheck className="h-3 w-3" />
                    {row.modernModules.join(" / ")}
                  </div>
                </div>
                <div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                <div className="text-slate-600">
                  <div>{row.nextAction}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {row.legacySource.join(" / ")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
