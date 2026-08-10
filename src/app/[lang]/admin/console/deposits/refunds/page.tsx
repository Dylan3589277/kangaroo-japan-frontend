"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  api,
  type AdminDepositRefundApproveSuccess,
  type AdminDepositRefundFailurePayload,
  type AdminDepositRefundListData,
  type AdminDepositRefundPendingItem,
} from "@/lib/api";

// 客服看到这两个 errcode 时，说明退款可能已经在路上或状态未知——
// 绝不能引导客服"再点一次审批"，必须明确提示"处理中，稍后重试"。
const UNCERTAIN_ERRCODES = new Set(["refund_uncertain", "refund_in_progress"]);

type DialogMode = "approve" | "reject";

interface ActionDialogState {
  mode: DialogMode;
  record: AdminDepositRefundPendingItem;
}

interface ExtractedFailure {
  errcode: string;
  errmsg: string;
  detail?: string;
  refundedCny?: number | null;
  remainingCny?: number | null;
}

function formatAmountCny(amount: number) {
  return `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function displayText(value: string | null | undefined, fallback = "-") {
  return value && value.trim() ? value : fallback;
}

/**
 * 押金退款审批 approve/reject 响应的成败判定 + 失败信封归一化。
 *
 * 🔴 这条链路不是标准 REST 资源接口：成功可能只有 `{code:0}`（reject）或
 * `{code:0, data:{orderNo, refunded_cny, legs}}`（approve），没有 status/
 * userName 这类字段；失败一律带 errcode（见 deposit-refund.admin.controller.ts
 * 注释："所有 errcode 原样透传，不做任何转换——前端要靠这些字段判断钱已出/未出"）。
 * 因此判据只认 errcode 是否存在（或 code!==0），绝不能用"没有某个字段"来猜成败，
 * 那样会把真实成功误判成失败、或反过来把失败误判成成功。
 */
function isFailureEnvelope(
  data: unknown,
): data is AdminDepositRefundFailurePayload {
  if (!data || typeof data !== "object") return true;
  const obj = data as Record<string, unknown>;
  if (typeof obj.errcode === "string" && obj.errcode) return true;
  if (typeof obj.code === "number" && obj.code !== 0) return true;
  return false;
}

function extractDepositRefundFailure(
  payload: AdminDepositRefundFailurePayload,
): ExtractedFailure {
  return {
    errcode: payload.errcode || "unknown_error",
    errmsg:
      payload.errmsg ||
      "（后端未返回 errmsg 原文——这是已知缺口，请勿凭空替客户解释，改联系技术核实这笔单据的真实退款状态）",
    detail: payload.detail,
    refundedCny: payload.refunded_cny,
    remainingCny: payload.remaining_cny,
  };
}

export default function DepositRefundApprovalPage() {
  const [records, setRecords] = useState<AdminDepositRefundPendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [dialogState, setDialogState] = useState<ActionDialogState | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");
  const [actionBusyOrderNo, setActionBusyOrderNo] = useState("");
  const [actionFailure, setActionFailure] = useState<ExtractedFailure | null>(
    null,
  );
  const [actionSuccessMessage, setActionSuccessMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setListError("");
    const response = await api.listAdminDepositRefunds();
    setLoading(false);

    if (!response.success) {
      setRecords([]);
      setListError(response.error?.message || "押金退款列表读取失败");
      return;
    }
    if (isFailureEnvelope(response.data)) {
      setRecords([]);
      const failure = extractDepositRefundFailure(
        response.data as AdminDepositRefundFailurePayload,
      );
      setListError(`${failure.errmsg}（errcode: ${failure.errcode}）`);
      return;
    }
    const listData = response.data as AdminDepositRefundListData;
    setRecords(listData.list || []);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function openDialog(mode: DialogMode, record: AdminDepositRefundPendingItem) {
    setDialogState({ mode, record });
    setRejectReason("");
    setActionFailure(null);
    setActionSuccessMessage("");
  }

  function closeDialog() {
    if (actionBusyOrderNo) return; // 请求进行中不允许关闭，避免用户以为取消了但请求仍在飞。
    setDialogState(null);
    setActionFailure(null);
  }

  async function confirmAction() {
    if (!dialogState) return;
    const { mode, record } = dialogState;
    setActionBusyOrderNo(record.orderNo);
    setActionFailure(null);
    setActionSuccessMessage("");

    const response =
      mode === "approve"
        ? await api.approveAdminDepositRefund(record.orderNo)
        : await api.rejectAdminDepositRefund(
            record.orderNo,
            rejectReason.trim() || undefined,
          );

    setActionBusyOrderNo("");

    // HTTP 级失败（网络错误 / 401 换 token 失败 / 5xx）。
    if (!response.success) {
      setActionFailure({
        errcode: response.error?.code || "http_error",
        errmsg: response.error?.message || "请求失败，未获得后端响应",
      });
      return;
    }

    // 业务级失败：HTTP 200 但 data 带 errcode（refund_execution_error 等）。
    if (isFailureEnvelope(response.data)) {
      setActionFailure(
        extractDepositRefundFailure(
          response.data as AdminDepositRefundFailurePayload,
        ),
      );
      return;
    }

    if (mode === "approve") {
      const success = response.data as AdminDepositRefundApproveSuccess;
      setActionSuccessMessage(
        `已批准并完成退款：${success.orderNo}，实退 ${formatAmountCny(
          success.refunded_cny,
        )}。`,
      );
    } else {
      setActionSuccessMessage(`已拒绝 ${record.orderNo} 的押金退款申请。`);
    }
    setDialogState(null);
    await load();
  }

  const isUncertainErrcode = actionFailure
    ? UNCERTAIN_ERRCODES.has(actionFailure.errcode)
    : false;

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 overflow-x-auto">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4" />
            订单管理 / 押金审批
          </div>
          <h1 className="mt-2 text-2xl font-semibold">押金退款审批</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            待审核的会员押金退款申请，审批/拒绝前请核对金额与用户信息。
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-28 shrink-0 justify-center"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {actionSuccessMessage ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
        >
          {actionSuccessMessage}
        </div>
      ) : null}

      {listError ? (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950"
        >
          <p className="font-medium">{listError}</p>
        </div>
      ) : null}

      <Card className="min-w-0 max-w-full">
        <CardHeader className="border-b">
          <CardTitle>待审列表</CardTitle>
          <CardDescription>
            接口只返回状态为「退款中（待审核）」的申请，本页不展示已批准/已拒绝的历史记录。
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="w-full max-w-full overflow-x-auto rounded-lg border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 font-medium">单号</th>
                  <th className="px-3 py-3 font-medium">用户</th>
                  <th className="px-3 py-3 font-medium">金额（CNY）</th>
                  <th className="px-3 py-3 font-medium">申请时间</th>
                  <th className="px-3 py-3 font-medium">状态</th>
                  <th className="px-3 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-12 text-center text-muted-foreground"
                    >
                      正在读取待审列表...
                    </td>
                  </tr>
                ) : null}
                {!loading && !listError && records.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-12 text-center text-muted-foreground"
                    >
                      暂无待审核的押金退款申请。
                    </td>
                  </tr>
                ) : null}
                {!loading && !listError
                  ? records.map((record) => (
                      <tr key={record.orderNo} className="border-t align-top">
                        <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                          {record.orderNo}
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-mono text-xs text-muted-foreground">
                            用户 ID：
                          </span>
                          {displayText(record.userId, "未知用户")}
                        </td>
                        <td className="px-3 py-3 font-mono font-medium">
                          {formatAmountCny(record.amountCny)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                          {displayText(record.appliedAt)}
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant="outline">待审核</Badge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => openDialog("approve", record)}
                              disabled={actionBusyOrderNo === record.orderNo}
                            >
                              审批
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => openDialog("reject", record)}
                              disabled={actionBusyOrderNo === record.orderNo}
                            >
                              拒绝
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={dialogState !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState?.mode === "approve"
                ? "确认批准押金退款"
                : "确认拒绝押金退款"}
            </DialogTitle>
            <DialogDescription>
              {dialogState
                ? `用户 ID：${displayText(
                    dialogState.record.userId,
                    "未知用户",
                  )} ／ 金额：${formatAmountCny(
                    dialogState.record.amountCny,
                  )} ／ 单号：${dialogState.record.orderNo}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {dialogState?.mode === "reject" ? (
            <div className="space-y-1.5">
              <label
                htmlFor="reject-reason"
                className="text-sm text-muted-foreground"
              >
                拒绝原因（可选，会随审批记录一并留存）
              </label>
              <Input
                id="reject-reason"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="例如：金额与订单不符"
                disabled={!!actionBusyOrderNo}
              />
            </div>
          ) : null}

          {actionFailure ? (
            <div
              role="alert"
              className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm text-destructive"
            >
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                操作失败
                {isUncertainErrcode ? (
                  <Badge
                    variant="outline"
                    className="border-destructive/40 text-destructive"
                  >
                    处理中，稍后重试
                  </Badge>
                ) : null}
              </div>
              <p className="font-mono text-xs">
                errcode: {actionFailure.errcode}
              </p>
              <p className="whitespace-pre-wrap">{actionFailure.errmsg}</p>
              {actionFailure.detail ? (
                <p className="whitespace-pre-wrap text-xs">
                  详情：{actionFailure.detail}
                </p>
              ) : null}
              {actionFailure.refundedCny != null ||
              actionFailure.remainingCny != null ? (
                <p className="font-mono text-xs">
                  已退：
                  {actionFailure.refundedCny != null
                    ? formatAmountCny(actionFailure.refundedCny)
                    : "未知"}{" "}
                  ／ 剩余：
                  {actionFailure.remainingCny != null
                    ? formatAmountCny(actionFailure.remainingCny)
                    : "未知"}
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={!!actionBusyOrderNo}
            >
              取消
            </Button>
            <Button
              type="button"
              variant={dialogState?.mode === "reject" ? "destructive" : "default"}
              onClick={() => void confirmAction()}
              disabled={!!actionBusyOrderNo}
            >
              {actionBusyOrderNo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {dialogState?.mode === "approve" ? "确认批准" : "确认拒绝"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
