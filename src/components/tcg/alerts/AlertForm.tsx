"use client";

import { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  subscribeAlert,
  type AlertChannelType,
  type AlertFilters,
} from "./alerts-data";

/**
 * 设计 A（深色高级感）上新提醒订阅表单。
 * 字段：keyword（必填）+ 可选 filters（稀有度/套系/最高价 JPY/卡况）+ 渠道二选一
 * （Email 填邮箱 / Discord 填 webhook）。提交 → subscribeAlert → 成功/失败/校验态反馈。
 *
 * 复用 /cards 已有的稀有度键集（sar/ssr/ar/sr/ur/promo/psa/sealed），文案走
 * tcg-alerts.form.rarity.*。校验全在事件回调里做（提交时），不在 effect 里 setState，
 * 满足项目 husky 规则。
 *
 * 可被落地页直接渲染，也可被搜索页 modal 复用：通过 defaultKeyword/defaultFilters
 * 预填，onSuccess 关闭 modal。compact=true 时收紧间距、过滤区默认展开。
 */

// 与 CardsSearchPage 的 RARITY_FILTERS 同一套键，保持稀有度选项风格一致。
const RARITY_KEYS = [
  "sar",
  "ssr",
  "ar",
  "sr",
  "ur",
  "promo",
  "psa",
  "sealed",
] as const;

// 卡况键集（后端 condition 自由字符串；这里给一组人话选项）。
const CONDITION_KEYS = ["new", "likeNew", "good", "acceptable"] as const;

const DISCORD_WEBHOOK_PREFIX = "https://discord.com/api/webhooks/";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AlertFormProps {
  /** 预填关键词（搜索页一键建提醒用）。 */
  defaultKeyword?: string;
  /** 预填筛选（搜索页把当前 minPrice/rarity 等映射过来）。 */
  defaultFilters?: AlertFilters;
  /** 成功后回调（modal 用于关闭；落地页可不传）。 */
  onSuccess?: (subscriptionId: string) => void;
  /** 紧凑模式（modal 内）：收紧外层间距、过滤区默认展开。 */
  compact?: boolean;
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; channel: AlertChannelType; email: string }
  | { kind: "error"; message: string };

export function AlertForm({
  defaultKeyword = "",
  defaultFilters,
  onSuccess,
  compact = false,
}: AlertFormProps) {
  const t = useTranslations("tcg-alerts.form");
  const fieldId = useId();

  const [keyword, setKeyword] = useState(defaultKeyword);
  const [showFilters, setShowFilters] = useState(
    compact || Boolean(defaultFilters && Object.keys(defaultFilters).length > 0),
  );
  const [rarity, setRarity] = useState(defaultFilters?.rarity ?? "");
  const [setName, setSetName] = useState(defaultFilters?.setName ?? "");
  const [maxPrice, setMaxPrice] = useState(
    typeof defaultFilters?.maxPriceJpy === "number"
      ? String(defaultFilters.maxPriceJpy)
      : "",
  );
  const [condition, setCondition] = useState(defaultFilters?.condition ?? "");

  const [channel, setChannel] = useState<AlertChannelType>("email");
  const [email, setEmail] = useState("");
  const [discordWebhook, setDiscordWebhook] = useState("");

  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });
  // 字段级校验错误（提交时一次性算出；用户编辑同字段时清掉对应错误）。
  const [errors, setErrors] = useState<Record<string, string>>({});

  const maxPriceJpy = useMemo(() => {
    const raw = maxPrice.replaceAll(",", "").trim();
    if (!raw) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : NaN;
  }, [maxPrice]);

  const clearError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submit.kind === "submitting") return;

    // 一次性校验，错全收集后统一展示（不在 effect 里 setState）。
    const nextErrors: Record<string, string> = {};
    const kw = keyword.trim();
    if (!kw) nextErrors.keyword = t("keywordRequired");

    if (maxPrice.trim() && Number.isNaN(maxPriceJpy)) {
      nextErrors.maxPrice = t("maxPriceInvalid");
    }

    const trimmedEmail = email.trim();
    const trimmedWebhook = discordWebhook.trim();
    if (channel === "email") {
      if (!trimmedEmail) nextErrors.email = t("emailRequired");
      else if (!EMAIL_RE.test(trimmedEmail)) nextErrors.email = t("emailInvalid");
    } else {
      if (!trimmedWebhook) nextErrors.discord = t("discordRequired");
      else if (!trimmedWebhook.startsWith(DISCORD_WEBHOOK_PREFIX))
        nextErrors.discord = t("discordInvalid");
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    setSubmit({ kind: "submitting" });
    const result = await subscribeAlert({
      keyword: kw,
      filters: {
        rarity: rarity || undefined,
        setName: setName.trim() || undefined,
        maxPriceJpy:
          typeof maxPriceJpy === "number" && !Number.isNaN(maxPriceJpy)
            ? maxPriceJpy
            : undefined,
        condition: condition || undefined,
      },
      channel: {
        type: channel,
        email: channel === "email" ? trimmedEmail : undefined,
        discordWebhook: channel === "discord" ? trimmedWebhook : undefined,
      },
      locale: "en",
    });

    if (result.success && result.data) {
      setSubmit({ kind: "success", channel, email: trimmedEmail });
      onSuccess?.(result.data.subscriptionId);
    } else {
      setSubmit({ kind: "error", message: t("errorGeneric") });
    }
  };

  const resetForm = () => {
    setSubmit({ kind: "idle" });
    setErrors({});
    setKeyword(defaultKeyword);
    setRarity(defaultFilters?.rarity ?? "");
    setSetName(defaultFilters?.setName ?? "");
    setMaxPrice(
      typeof defaultFilters?.maxPriceJpy === "number"
        ? String(defaultFilters.maxPriceJpy)
        : "",
    );
    setCondition(defaultFilters?.condition ?? "");
    setEmail("");
    setDiscordWebhook("");
  };

  // 成功态：替换表单为成功卡片（email 提示去邮箱确认；discord 已生效）。
  if (submit.kind === "success") {
    const isEmail = submit.channel === "email";
    return (
      <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/[0.06] p-6 text-center sm:p-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-300">
          <svg
            className="size-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="m5 13 4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="mt-4 font-[family-name:var(--font-display)] text-lg font-bold text-white">
          {isEmail ? t("successEmailTitle") : t("successDiscordTitle")}
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-300">
          {isEmail
            ? t("successEmailBody", { email: submit.email })
            : t("successDiscordBody")}
        </p>
        <button
          type="button"
          onClick={resetForm}
          className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
        >
          {t("createAnother")}
        </button>
      </div>
    );
  }

  const submitting = submit.kind === "submitting";
  const inputClass =
    "h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-cyan-400/50";
  const labelClass =
    "block text-xs font-semibold uppercase tracking-wider text-slate-400";
  const errorClass = "mt-1.5 text-xs text-rose-300";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={compact ? "space-y-4" : "space-y-5"}
    >
      {/* 关键词（必填） */}
      <div>
        <label htmlFor={`${fieldId}-keyword`} className={labelClass}>
          {t("keywordLabel")}
        </label>
        <input
          id={`${fieldId}-keyword`}
          type="text"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            clearError("keyword");
          }}
          placeholder={t("keywordPlaceholder")}
          aria-invalid={Boolean(errors.keyword)}
          className={`mt-1.5 ${inputClass}`}
        />
        {errors.keyword ? (
          <p className={errorClass}>{errors.keyword}</p>
        ) : (
          <p className="mt-1.5 text-xs text-slate-500">{t("keywordHint")}</p>
        )}
      </div>

      {/* 可选筛选区（折叠） */}
      <div>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-300 transition-colors hover:text-cyan-200"
        >
          <svg
            className={`size-4 transition-transform ${showFilters ? "rotate-45" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeWidth={1.8}
              d="M12 5v14M5 12h14"
            />
          </svg>
          {showFilters ? t("filtersHide") : t("filtersToggle")}
        </button>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 稀有度 */}
            <div>
              <label htmlFor={`${fieldId}-rarity`} className={labelClass}>
                {t("rarityLabel")}
              </label>
              <select
                id={`${fieldId}-rarity`}
                value={rarity}
                onChange={(e) => setRarity(e.target.value)}
                className={`mt-1.5 ${inputClass} appearance-none`}
              >
                <option value="">{t("rarityAny")}</option>
                {RARITY_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t(`rarity.${key}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* 卡况 */}
            <div>
              <label htmlFor={`${fieldId}-condition`} className={labelClass}>
                {t("conditionLabel")}
              </label>
              <select
                id={`${fieldId}-condition`}
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className={`mt-1.5 ${inputClass} appearance-none`}
              >
                <option value="">{t("conditionAny")}</option>
                {CONDITION_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t(`condition.${key}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* 套系/系列 */}
            <div>
              <label htmlFor={`${fieldId}-set`} className={labelClass}>
                {t("setLabel")}
              </label>
              <input
                id={`${fieldId}-set`}
                type="text"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder={t("setPlaceholder")}
                className={`mt-1.5 ${inputClass}`}
              />
            </div>

            {/* 最高价 JPY */}
            <div>
              <label htmlFor={`${fieldId}-maxprice`} className={labelClass}>
                {t("maxPriceLabel")}
              </label>
              <input
                id={`${fieldId}-maxprice`}
                type="number"
                inputMode="numeric"
                min={0}
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  clearError("maxPrice");
                }}
                placeholder={t("maxPricePlaceholder")}
                aria-invalid={Boolean(errors.maxPrice)}
                className={`mt-1.5 ${inputClass}`}
              />
              {errors.maxPrice ? (
                <p className={errorClass}>{errors.maxPrice}</p>
              ) : (
                <p className="mt-1.5 text-xs text-slate-500">
                  {t("maxPriceHint")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 渠道二选一 */}
      <div>
        <span className={labelClass}>{t("channelLabel")}</span>
        <div className="mt-2 inline-flex rounded-xl border border-white/12 bg-white/[0.03] p-1">
          {(["email", "discord"] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={channel === c}
              onClick={() => {
                setChannel(c);
                clearError("email");
                clearError("discord");
              }}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                channel === c
                  ? "bg-cyan-400 text-[#06121b]"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {t(`channel.${c}`)}
            </button>
          ))}
        </div>

        {channel === "email" ? (
          <div className="mt-3">
            <label htmlFor={`${fieldId}-email`} className={labelClass}>
              {t("emailLabel")}
            </label>
            <input
              id={`${fieldId}-email`}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError("email");
              }}
              placeholder={t("emailPlaceholder")}
              aria-invalid={Boolean(errors.email)}
              className={`mt-1.5 ${inputClass}`}
            />
            {errors.email && <p className={errorClass}>{errors.email}</p>}
          </div>
        ) : (
          <div className="mt-3">
            <label htmlFor={`${fieldId}-discord`} className={labelClass}>
              {t("discordLabel")}
            </label>
            <input
              id={`${fieldId}-discord`}
              type="url"
              value={discordWebhook}
              onChange={(e) => {
                setDiscordWebhook(e.target.value);
                clearError("discord");
              }}
              placeholder={t("discordPlaceholder")}
              aria-invalid={Boolean(errors.discord)}
              className={`mt-1.5 ${inputClass}`}
            />
            {errors.discord ? (
              <p className={errorClass}>{errors.discord}</p>
            ) : (
              <p className="mt-1.5 text-xs text-slate-500">
                {t("discordHint")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 提交错误（非字段级） */}
      {submit.kind === "error" && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/[0.08] px-4 py-3">
          <p className="text-sm font-semibold text-rose-200">
            {t("errorTitle")}
          </p>
          <p className="mt-0.5 text-xs text-rose-200/80">{submit.message}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 text-sm font-bold text-[#06121b] transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? t("submitting") : t("submit")}
      </button>

      <p className="text-center text-xs leading-relaxed text-slate-500">
        {t("privacyNote")}
      </p>
    </form>
  );
}
