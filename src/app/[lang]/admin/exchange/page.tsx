"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, type ExchangeRatesResponse } from "@/lib/api";

type ExchangeForm = {
  jpyToCny: string;
  jpyToUsd: string;
  cnyToUsd: string;
};

function toForm(rates: ExchangeRatesResponse): ExchangeForm {
  return {
    jpyToCny: String(rates.pairs.jpyToCny),
    jpyToUsd: String(rates.pairs.jpyToUsd),
    cnyToUsd: String(rates.pairs.cnyToUsd),
  };
}

function parseRate(value: string) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : undefined;
}

function compactDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

export default function AdminExchangePage() {
  const [rates, setRates] = useState<ExchangeRatesResponse | null>(null);
  const [form, setForm] = useState<ExchangeForm>({
    jpyToCny: "",
    jpyToUsd: "",
    cnyToUsd: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const preview = useMemo(() => {
    const jpyToCny = parseRate(form.jpyToCny);
    const jpyToUsd = parseRate(form.jpyToUsd);
    const cnyToUsd = parseRate(form.cnyToUsd);
    return {
      cnyFor10000Jpy: jpyToCny ? 10000 * jpyToCny : null,
      usdFor10000Jpy: jpyToUsd ? 10000 * jpyToUsd : null,
      usdFor1000Cny: cnyToUsd ? 1000 * cnyToUsd : null,
    };
  }, [form]);

  async function loadRates() {
    setLoading(true);
    setError("");
    const response = await api.getExchangeRates();
    setLoading(false);
    if (!response.success || !response.data) {
      setError(response.error?.message || "汇率读取失败");
      return;
    }
    setRates(response.data);
    setForm(toForm(response.data));
  }

  useEffect(() => {
    let active = true;

    api
      .getExchangeRates()
      .then((response) => {
        if (!active) return;
        setLoading(false);
        if (!response.success || !response.data) {
          setError(response.error?.message || "汇率读取失败");
          return;
        }
        setRates(response.data);
        setForm(toForm(response.data));
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
        setError("汇率读取失败");
      });

    return () => {
      active = false;
    };
  }, []);

  function updateField(field: keyof ExchangeForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      jpyToCny: parseRate(form.jpyToCny),
      jpyToUsd: parseRate(form.jpyToUsd),
      cnyToUsd: parseRate(form.cnyToUsd),
    };
    if (!payload.jpyToCny || !payload.jpyToUsd || !payload.cnyToUsd) {
      setError("三组汇率都必须是大于 0 的数字");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    const response = await api.updateExchangeRates(payload);
    setSaving(false);
    if (!response.success || !response.data) {
      setError(response.error?.message || "汇率保存失败");
      return;
    }
    setRates(response.data);
    setForm(toForm(response.data));
    setMessage("汇率已保存，后续新订单会使用这组汇率快照");
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-muted-foreground">后台配置 / 汇率</div>
        <h1 className="mt-2 text-2xl font-semibold">汇率管理</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          当前汇率以 JPY
          为基准，新订单创建时会写入订单汇率快照；已创建订单不会被后续汇率改动重算。
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>当前来源</CardTitle>
            <CardDescription>后台覆盖优先于环境变量。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge
              variant={
                rates?.source === "admin_override" ? "secondary" : "outline"
              }
            >
              {rates?.source === "admin_override" ? "后台汇率" : "环境变量"}
            </Badge>
            <div className="text-sm text-muted-foreground">
              更新时间：{compactDate(rates?.lastUpdated)}
            </div>
            <div className="text-sm text-muted-foreground">
              更新人：{rates?.updatedBy || "-"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>JPY 换算</CardTitle>
            <CardDescription>按表单内数值实时预览。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>
              10,000 JPY = {preview.cnyFor10000Jpy?.toFixed(2) || "-"} CNY
            </div>
            <div>
              10,000 JPY = {preview.usdFor10000Jpy?.toFixed(2) || "-"} USD
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>CNY 换算</CardTitle>
            <CardDescription>用于订单 USD 金额辅助计算。</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            1,000 CNY = {preview.usdFor1000Cny?.toFixed(2) || "-"} USD
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3 md:flex md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>编辑汇率</CardTitle>
            <CardDescription>
              保存后只影响新订单，订单详情会保留创建时快照。
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={loadRates}
            disabled={loading || saving}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            刷新
          </Button>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="mb-4 rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
              {message}
            </div>
          ) : null}

          <form className="grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
            <label className="space-y-2 text-sm font-medium">
              <span>JPY → CNY</span>
              <Input
                inputMode="decimal"
                value={form.jpyToCny}
                onChange={(event) =>
                  updateField("jpyToCny", event.target.value)
                }
                placeholder="0.05"
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>JPY → USD</span>
              <Input
                inputMode="decimal"
                value={form.jpyToUsd}
                onChange={(event) =>
                  updateField("jpyToUsd", event.target.value)
                }
                placeholder="0.0067"
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>CNY → USD</span>
              <Input
                inputMode="decimal"
                value={form.cnyToUsd}
                onChange={(event) =>
                  updateField("cnyToUsd", event.target.value)
                }
                placeholder="0.14"
              />
            </label>
            <div className="md:col-span-3">
              <Button type="submit" disabled={loading || saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                保存汇率
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
