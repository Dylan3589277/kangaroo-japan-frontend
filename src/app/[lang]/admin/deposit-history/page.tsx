"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  History,
  RefreshCw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";

const PAGE_SIZE = 50;
const HISTORICAL_STATUS_LABELS: Record<string, string> = {
  "0": "处理中",
  "1": "已处理",
  "2": "申请退款被拒绝",
};
const HISTORICAL_PAY_WAY_LABELS: Record<string, string> = {
  alipay: "Alipay 来源",
  wepay: "WePay 来源",
  payclound: "PayClound 来源",
  taobao: "Taobao 来源",
};

type LegacyRecordValue = string | number | null;
type LegacyDepositRecordType =
  | "LEGACY_DEPOSIT_REFUND"
  | "LEGACY_DEPOSIT_RECHARGE"
  | "LEGACY_ADMIN_DEPOSIT_RECHARGE"
  | "LEGACY_DEPOSIT_DEDUCT"
  | "UNCLASSIFIED_LEGACY_RECORD";

interface LegacyDepositHistoryRecord {
  id: LegacyRecordValue;
  money: LegacyRecordValue;
  online_refund_money: LegacyRecordValue;
  status: LegacyRecordValue;
  pay_way: LegacyRecordValue;
  type: LegacyRecordValue;
  create_time: LegacyRecordValue;
  record_type: LegacyDepositRecordType;
}

interface LegacyDepositHistoryPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface LegacyDepositHistoryData {
  records: LegacyDepositHistoryRecord[];
  pagination: LegacyDepositHistoryPagination;
}

interface LegacyDepositHistoryFailure {
  success: false;
  error?: {
    code?: string;
    message?: string;
  };
}

function isHistoryData(value: unknown): value is LegacyDepositHistoryData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  if (
    !Array.isArray(data.records) ||
    !data.pagination ||
    typeof data.pagination !== "object"
  ) {
    return false;
  }
  const pagination = data.pagination as Record<string, unknown>;
  return (
    typeof pagination.page === "number" &&
    typeof pagination.page_size === "number" &&
    typeof pagination.total === "number" &&
    typeof pagination.total_pages === "number" &&
    typeof pagination.has_next === "boolean" &&
    typeof pagination.has_prev === "boolean"
  );
}

function isFailureData(value: unknown): value is LegacyDepositHistoryFailure {
  if (!value || typeof value !== "object") return false;
  return (value as Record<string, unknown>).success === false;
}

function displayValue(value: LegacyRecordValue) {
  if (value === null || value === "") return "-";
  return String(value);
}

function sourceLiteral(value: LegacyRecordValue) {
  if (value === null || value === "") return null;
  return String(value);
}

function unavailableMessage(code?: string) {
  if (code === "legacy_dsr_unavailable") {
    return "历史数据上游当前不可用，无法读取旧押金流水。";
  }
  if (code === "legacy_identity_token_required") {
    return "历史数据读取凭据不可用，无法读取旧押金流水。";
  }
  if (code === "legacy_dsr_contract_invalid") {
    return "历史数据返回格式未通过校验，当前不展示记录。";
  }
  return "旧押金流水读取失败，当前未展示任何替代数据。";
}

function RecordTypeLabel({ type }: { type: LegacyDepositRecordType }) {
  if (type === "UNCLASSIFIED_LEGACY_RECORD") {
    return (
      <Badge
        variant="outline"
        className="border-slate-200 bg-slate-100 text-slate-600"
      >
        UNCLASSIFIED_LEGACY_RECORD
      </Badge>
    );
  }

  return <Badge variant="outline">{type}</Badge>;
}

function HistoricalStatusLabel({ value }: { value: LegacyRecordValue }) {
  const literal = sourceLiteral(value);
  const label = literal ? HISTORICAL_STATUS_LABELS[literal] : undefined;

  return (
    <div className="flex flex-col items-start gap-1">
      {label ? (
        <Badge variant="outline">旧来源标签：{label}</Badge>
      ) : (
        <Badge
          variant="outline"
          className="border-slate-200 bg-slate-100 text-slate-600"
        >
          未分类旧状态值
        </Badge>
      )}
      <span className="font-mono text-xs text-muted-foreground">
        源值：{literal ?? "未提供"}
      </span>
    </div>
  );
}

function HistoricalPayWayLabel({ value }: { value: LegacyRecordValue }) {
  const literal = sourceLiteral(value);
  const label = literal ? HISTORICAL_PAY_WAY_LABELS[literal] : undefined;

  return (
    <div className="flex flex-col items-start gap-1">
      {label ? (
        <Badge variant="outline">{label}（旧来源标签）</Badge>
      ) : (
        <Badge
          variant="outline"
          className="border-slate-200 bg-slate-100 text-slate-600"
        >
          未分类旧支付方式
        </Badge>
      )}
      <span className="font-mono text-xs text-muted-foreground">
        源值：{literal ?? "未提供"}
      </span>
    </div>
  );
}

export default function AdminDepositHistoryPage() {
  const [records, setRecords] = useState<LegacyDepositHistoryRecord[]>([]);
  const [pagination, setPagination] =
    useState<LegacyDepositHistoryPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");

  const load = useCallback(async (page: number) => {
    setLoading(true);
    setError("");
    setErrorCode("");

    const response = await api.request<
      LegacyDepositHistoryData | LegacyDepositHistoryFailure
    >(`/admin/legacy-deposit/history?page=${page}&page_size=${PAGE_SIZE}`);

    setLoading(false);

    if (!response.success) {
      setRecords([]);
      setPagination(null);
      setErrorCode(response.error?.code || "");
      setError(unavailableMessage(response.error?.code));
      return;
    }

    if (isFailureData(response.data)) {
      setRecords([]);
      setPagination(null);
      setErrorCode(response.data.error?.code || "");
      setError(unavailableMessage(response.data.error?.code));
      return;
    }

    if (!isHistoryData(response.data)) {
      setRecords([]);
      setPagination(null);
      setError(unavailableMessage("legacy_dsr_contract_invalid"));
      setErrorCode("legacy_dsr_contract_invalid");
      return;
    }

    setRecords(response.data.records);
    setPagination(response.data.pagination);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const currentPage = pagination?.page ?? 1;

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 overflow-x-auto">
      <div
        role="alert"
        className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <span>此面板仅供历史参考，不代表退款审批状态，不可用于业务决策</span>
      </div>

      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <History className="h-4 w-4" />
            管理后台 / 只读参考
          </div>
          <h1 className="mt-2 text-2xl font-semibold">
            旧押金流水参考（历史只读）
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            仅展示后端返回的脱敏旧流水字段；数据不可用时不提供示例或替代记录。
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-28 shrink-0 justify-center"
          onClick={() => void load(currentPage)}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          重新读取
        </Button>
      </div>

      {error ? (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950"
        >
          <p className="font-medium">{error}</p>
          <p className="mt-1 text-amber-800">
            旧数据来源可能尚未部署或暂时不可访问，本面板不据此推断业务状态。
          </p>
          {errorCode ? (
            <p className="mt-2 font-mono text-xs text-amber-700">
              error: {errorCode}
            </p>
          ) : null}
        </div>
      ) : null}

      <Card className="min-w-0 max-w-full">
        <CardHeader className="border-b">
          <CardTitle>脱敏历史记录</CardTitle>
          <CardDescription>
            状态与支付方式仅按受控的历史来源标签展示；未分类值保留原始字面量供参考。
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="w-full max-w-full overflow-x-auto rounded-lg border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 font-medium">记录 ID</th>
                  <th className="px-3 py-3 font-medium">金额（原始值）</th>
                  <th className="px-3 py-3 font-medium">
                    线上退款金额（历史字段）
                  </th>
                  <th className="px-3 py-3 font-medium">状态（旧来源标签）</th>
                  <th className="px-3 py-3 font-medium">
                    支付方式（旧来源标签）
                  </th>
                  <th className="px-3 py-3 font-medium">创建时间</th>
                  <th className="px-3 py-3 font-medium">记录类型</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-12 text-center text-muted-foreground"
                    >
                      正在读取脱敏历史记录...
                    </td>
                  </tr>
                ) : null}
                {!loading && !error && records.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-12 text-center text-muted-foreground"
                    >
                      暂无可显示的历史记录；本面板不会填充示例数据。
                    </td>
                  </tr>
                ) : null}
                {!loading && !error
                  ? records.map((record, index) => (
                      <tr
                        key={`${displayValue(record.id)}-${index}`}
                        className="border-t align-top"
                      >
                        <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                          {displayValue(record.id)}
                        </td>
                        <td className="px-3 py-3 font-mono font-medium">
                          {displayValue(record.money)}
                        </td>
                        <td className="px-3 py-3 font-mono">
                          {displayValue(record.online_refund_money)}
                        </td>
                        <td className="px-3 py-3">
                          <HistoricalStatusLabel value={record.status} />
                        </td>
                        <td className="px-3 py-3">
                          <HistoricalPayWayLabel value={record.pay_way} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                          {displayValue(record.create_time)}
                        </td>
                        <td className="px-3 py-3">
                          <RecordTypeLabel type={record.record_type} />
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          {pagination
            ? `共 ${pagination.total} 条 / 第 ${pagination.page} 页，共 ${pagination.total_pages} 页 / 每页 ${pagination.page_size} 条`
            : "仅在成功读取后显示分页信息。"}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-24 shrink-0 justify-center"
            onClick={() => void load(currentPage - 1)}
            disabled={loading || !pagination?.has_prev}
          >
            <ChevronLeft className="h-4 w-4" />
            上一页
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-24 shrink-0 justify-center"
            onClick={() => void load(currentPage + 1)}
            disabled={loading || !pagination?.has_next}
          >
            下一页
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
