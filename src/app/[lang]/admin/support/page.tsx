"use client";

import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, ClipboardList, Download, Loader2, Search, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, type SupportOrderLookupItem } from "@/lib/api";

type TicketStatus = "new" | "in_progress" | "waiting_customer" | "resolved";
type TicketPriority = "normal" | "urgent";

type TicketLedgerRow = {
  ticketNo: string;
  createdAt: string;
  source: string;
  language: string;
  customerEmail: string;
  orderNo: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  owner: string;
  nextAction: string;
  summary: string;
  updatedAt: string;
};

type OrderLookupForm = {
  orderNo: string;
  email: string;
  phone: string;
  trackingNumber: string;
};

const statusLabel: Record<TicketStatus, string> = {
  new: "新工单",
  in_progress: "处理中",
  waiting_customer: "等客户回复",
  resolved: "已解决",
};

const priorityLabel: Record<TicketPriority, string> = {
  normal: "普通",
  urgent: "紧急",
};

const ledgerRows: TicketLedgerRow[] = [
  {
    ticketNo: "SUP-20260510-001",
    createdAt: "2026-05-10 18:30",
    source: "tawk.to 在线咨询",
    language: "zh",
    customerEmail: "customer@example.com",
    orderNo: "未提供",
    category: "商品咨询",
    priority: "normal",
    status: "new",
    owner: "未分配",
    nextAction: "确认客户想购买的平台链接和预算",
    summary: "示例：客户询问日本代拍商品是否可以发往海外。",
    updatedAt: "2026-05-10 18:30",
  },
  {
    ticketNo: "SUP-20260510-002",
    createdAt: "2026-05-10 19:00",
    source: "离线留言",
    language: "ja",
    customerEmail: "hidden@example.com",
    orderNo: "DSJ-****-1234",
    category: "物流问题",
    priority: "urgent",
    status: "in_progress",
    owner: "客服A",
    nextAction: "核对公开物流状态，不在第三方工具中粘贴完整地址",
    summary: "示例：客户询问预计发货时间。",
    updatedAt: "2026-05-10 19:05",
  },
];

const csvHeaders = [
  "工单编号",
  "创建时间",
  "站点",
  "来源",
  "语言",
  "页面路径",
  "客户邮箱",
  "订单号",
  "问题分类",
  "优先级",
  "状态",
  "负责人",
  "最后更新时间",
  "处理摘要",
  "下一步动作",
  "备注",
];

const csvTemplateRows = [
  [
    "SUP-YYYYMMDD-001",
    "2026-05-10 19:00",
    "kangaroo-japan",
    "tawk.to / 离线留言 / 邮件 / 人工录入",
    "zh / ja / en",
    "/zh/products/example",
    "customer@example.com",
    "DSJ-****-1234",
    "商品咨询 / 订单问题 / 物流问题 / 退款问题 / 投诉建议",
    "普通 / 紧急",
    "新工单 / 处理中 / 等客户回复 / 已解决",
    "客服姓名",
    "2026-05-10 19:10",
    "只写处理摘要，不粘贴完整手机号、完整地址、支付号",
    "下一步要做什么",
    "内部备注，禁止记录支付敏感信息",
  ],
];

function escapeCsvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function buildCsv() {
  return [csvHeaders, ...csvTemplateRows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function downloadCsvTemplate() {
  const blob = new Blob([`\ufeff${buildCsv()}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kangaroo-japan-support-ticket-ledger-template.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function compactDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function hasLookupCondition(form: OrderLookupForm) {
  return Object.values(form).some((value) => value.trim().length >= 4);
}

export default function AdminSupportPage() {
  const [keyword, setKeyword] = useState("");
  const [lookupForm, setLookupForm] = useState<OrderLookupForm>({
    orderNo: "",
    email: "",
    phone: "",
    trackingNumber: "",
  });
  const [lookupItems, setLookupItems] = useState<SupportOrderLookupItem[]>([]);
  const [lookupTotal, setLookupTotal] = useState(0);
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const filteredRows = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return ledgerRows;
    return ledgerRows.filter((row) => Object.values(row).some((value) => value.toLowerCase().includes(normalized)));
  }, [keyword]);

  async function handleLookupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLookupError("");
    if (!hasLookupCondition(lookupForm)) {
      setLookupError("请至少填写一个 4 位以上的查询条件，避免过宽查询。可用订单号、邮箱、手机号或物流单号。");
      return;
    }

    setLookupLoading(true);
    const response = await api.lookupSupportOrders({ ...lookupForm, limit: 10 });
    setLookupLoading(false);
    if (!response.success || !response.data) {
      setLookupError(response.error?.message || "查询失败，请确认账号权限和查询条件。");
      setLookupItems([]);
      setLookupTotal(0);
      return;
    }
    setLookupItems(response.data.items || []);
    setLookupTotal(response.data.total || 0);
  }

  function updateLookupField(field: keyof OrderLookupForm, value: string) {
    setLookupForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="h-4 w-4" />
          客服工作台 · 低风险 MVP
        </div>
        <h1 className="mt-2 text-2xl font-semibold">客服工单台账</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          先把 tawk.to 在线咨询、离线留言和人工跟进统一记录到台账；订单/物流只读查询只给管理员使用，并保持脱敏、审计和限流边界。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>今日待处理</CardTitle>
            <CardDescription>示例台账统计，后续可接真实工单接口。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">2</div>
            <p className="mt-1 text-sm text-muted-foreground">新工单 1 个，处理中 1 个</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>客服红线</CardTitle>
            <CardDescription>避免隐私和资金风险。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>不在第三方客服工具粘贴完整手机号、完整地址、支付号。</p>
            <p>不直接承诺退款、赔偿、补发、改地址。</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>台账模板</CardTitle>
            <CardDescription>下载后可用 Excel / 飞书表格维护。</CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={downloadCsvTemplate}>
              <Download className="h-4 w-4" />
              下载 CSV 模板
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>订单/物流只读查询</CardTitle>
          <CardDescription>
            仅限管理员登录后使用。接口会做限流、审计记录和敏感信息脱敏；不提供退款、改地址、补发等写操作。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-5" onSubmit={handleLookupSubmit}>
            <Input
              value={lookupForm.orderNo}
              onChange={(event) => updateLookupField("orderNo", event.target.value)}
              placeholder="订单号"
              aria-label="订单号"
            />
            <Input
              value={lookupForm.email}
              onChange={(event) => updateLookupField("email", event.target.value)}
              placeholder="客户邮箱"
              aria-label="客户邮箱"
            />
            <Input
              value={lookupForm.phone}
              onChange={(event) => updateLookupField("phone", event.target.value)}
              placeholder="手机号"
              aria-label="手机号"
            />
            <Input
              value={lookupForm.trackingNumber}
              onChange={(event) => updateLookupField("trackingNumber", event.target.value)}
              placeholder="物流单号"
              aria-label="物流单号"
            />
            <Button type="submit" disabled={lookupLoading}>
              {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              查询
            </Button>
          </form>

          {lookupError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{lookupError}</div>
          ) : null}

          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">安全边界</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>最少 4 位查询条件，避免客服随意拉全量订单。</li>
              <li>手机号、邮箱、姓名、地址、邮编、物流单号均只返回脱敏值。</li>
              <li>每次查询都会记录审计日志，日志只存查询条件哈希，不存明文。</li>
            </ul>
          </div>

          {lookupItems.length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">共匹配 {lookupTotal} 条，当前显示 {lookupItems.length} 条。</div>
              {lookupItems.map((order) => (
                <div key={order.id} className="rounded-lg border p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold">{order.orderNo}</div>
                    <Badge variant="outline">{order.status}</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-muted-foreground md:grid-cols-2">
                    <div>客户：{order.customer.name || "-"} / {order.customer.email || "-"} / {order.customer.phone || "-"}</div>
                    <div>金额：{order.total.amount} {order.total.currency || ""}</div>
                    <div>下单时间：{compactDate(order.createdAt)}</div>
                    <div>支付时间：{compactDate(order.paidAt)}</div>
                    <div>物流：{order.shipping.carrier || "-"} / {order.shipping.trackingNumber || "-"}</div>
                    <div>收货城市：{order.shipping.address?.country || "-"} {order.shipping.address?.city || ""}</div>
                  </div>
                  <div className="mt-3 text-muted-foreground">
                    商品：{order.items.map((item) => `${item.title || "未命名商品"} × ${item.quantity}`).join("；") || "-"}
                  </div>
                  {order.shipmentOrders.length > 0 ? (
                    <div className="mt-3 rounded-md bg-muted p-3 text-muted-foreground">
                      仓库发货单：{order.shipmentOrders.map((shipment) => `${shipment.status || "未知状态"} / ${shipment.shipWay || "未知线路"}`).join("；")}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>tawk.to 预聊天表单字段建议</CardTitle>
          <CardDescription>
            预聊天表单需要在 tawk.to 后台开启；站点代码只传低敏上下文，不传订单详情。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              建议收集
            </div>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>姓名或称呼</li>
              <li>邮箱</li>
              <li>问题类型：商品、订单、物流、退款、投诉建议</li>
              <li>问题描述</li>
              <li>订单号后几位或用户主动提供的订单号</li>
            </ul>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center gap-2 font-medium text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              禁止自动传递
            </div>
            <ul className="list-disc space-y-1 pl-5 text-amber-900/80">
              <li>完整收货地址、完整手机号</li>
              <li>支付网关编号、支付卡信息</li>
              <li>后台订单备注和内部处理记录</li>
              <li>购物车、登录令牌、用户 ID 等敏感上下文</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3 md:flex md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>工单台账示例</CardTitle>
            <CardDescription>当前为安全示例数据；正式接工单接口前需要再确认鉴权和数据字段。</CardDescription>
          </div>
          <Input
            className="max-w-xs"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索工单、邮箱、分类"
            aria-label="搜索工单"
          />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">工单编号</th>
                  <th className="px-3 py-2 font-medium">来源</th>
                  <th className="px-3 py-2 font-medium">分类</th>
                  <th className="px-3 py-2 font-medium">优先级</th>
                  <th className="px-3 py-2 font-medium">状态</th>
                  <th className="px-3 py-2 font-medium">负责人</th>
                  <th className="px-3 py-2 font-medium">下一步</th>
                  <th className="px-3 py-2 font-medium">更新时间</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.ticketNo} className="border-t">
                    <td className="px-3 py-2 font-medium">{row.ticketNo}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.source}</td>
                    <td className="px-3 py-2">{row.category}</td>
                    <td className="px-3 py-2">
                      <Badge variant={row.priority === "urgent" ? "destructive" : "secondary"}>{priorityLabel[row.priority]}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{statusLabel[row.status]}</Badge>
                    </td>
                    <td className="px-3 py-2">{row.owner}</td>
                    <td className="max-w-[280px] px-3 py-2 text-muted-foreground">{row.nextAction}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.updatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
