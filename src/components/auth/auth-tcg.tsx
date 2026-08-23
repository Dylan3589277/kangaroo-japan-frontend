"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { spaceGrotesk } from "@/app/fonts";

/**
 * 设计方向 A（深色高级感）的 en 登录 / 注册呈现层。
 *
 * 纯展示组件：表单状态、校验、提交、跳转、注册即绑等业务逻辑仍在
 * login/page.tsx 与 register/page.tsx 内，本组件只接收 value/onChange/onSubmit
 * 等数据与回调，渲染成与新 TCG 外壳一致的深色界面（bg-[#0a0e16] + cyan-400 +
 * Space Grotesk）。仅在 locale === "en" 时使用，零影响其它语言。
 */

const shellClass = `min-h-screen bg-[#0a0e16] text-slate-200 antialiased`;
const cardClass =
  "w-full max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7 shadow-2xl shadow-black/40 sm:p-8";
const labelClass =
  "block text-xs font-semibold uppercase tracking-wide text-slate-400";
const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors focus:border-cyan-400/50";
const primaryBtnClass =
  "inline-flex h-12 w-full items-center justify-center rounded-xl bg-cyan-400 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50";

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${spaceGrotesk.variable} ${shellClass}`}>
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  );
}

function Brand({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-7 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
        <Image
          src="/brand/kangaroo-logo.png"
          alt="kangaroo"
          width={48}
          height={48}
          priority
          className="h-12 w-12 object-contain"
        />
      </div>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white">
        {title}
      </h1>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
        {subtitle}
      </p>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
      {message}
    </div>
  );
}

function HintBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-200">
      {message}
    </div>
  );
}

export interface TcgLoginTexts {
  title: string;
  subtitle: string;
  email: string;
  password: string;
  forgot: string;
  login: string;
  loggingIn: string;
  noAccount: string;
  register: string;
}

export function LoginTcgView({
  texts,
  lang,
  email,
  password,
  error,
  isLoading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  turnstileSlot,
}: {
  texts: TcgLoginTexts;
  lang: string;
  email: string;
  password: string;
  error: string;
  isLoading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  turnstileSlot?: React.ReactNode;
}) {
  return (
    <AuthShell>
      <div className={cardClass}>
        <Brand title={texts.title} subtitle={texts.subtitle} />

        <form onSubmit={onSubmit} className="space-y-5">
          {error && <ErrorBox message={error} />}

          <div>
            <label htmlFor="email" className={labelClass}>
              {texts.email}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="example@example.com"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="password" className={labelClass}>
                {texts.password}
              </label>
              <Link
                href={`/${lang}/forgot-password`}
                className="text-xs font-medium text-cyan-300 transition-colors hover:text-cyan-200"
              >
                {texts.forgot}
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          {turnstileSlot}

          <button type="submit" disabled={isLoading} className={primaryBtnClass}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {texts.loggingIn}
              </>
            ) : (
              texts.login
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {texts.noAccount}{" "}
          <Link
            href={`/${lang}/register`}
            className="font-medium text-cyan-300 transition-colors hover:text-cyan-200"
          >
            {texts.register}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export interface TcgRegisterTexts {
  title: string;
  subtitle: string;
  hasAccount: string;
  login: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  register: string;
  registering: string;
}

export function RegisterTcgView({
  texts,
  lang,
  formData,
  error,
  isLoading,
  onChange,
  onSubmit,
  turnstileSlot,
  legacyBindHint,
}: {
  texts: TcgRegisterTexts;
  lang: string;
  formData: {
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    phone: string;
  };
  error: string;
  isLoading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  turnstileSlot?: React.ReactNode;
  // 客服注册绑定链接携带有效参数时的提示文案；无参数时不传。
  legacyBindHint?: string;
}) {
  return (
    <AuthShell>
      <div className={cardClass}>
        <Brand title={texts.title} subtitle={texts.subtitle} />

        <form onSubmit={onSubmit} className="space-y-4">
          {legacyBindHint && <HintBox message={legacyBindHint} />}
          {error && <ErrorBox message={error} />}

          <div>
            <label htmlFor="name" className={labelClass}>
              {texts.name}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={formData.name}
              onChange={onChange}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="email" className={labelClass}>
              {texts.email}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="example@example.com"
              value={formData.email}
              onChange={onChange}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="phone" className={labelClass}>
              {texts.phone}
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+86 138 0000 0000"
              value={formData.phone}
              onChange={onChange}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="password" className={labelClass}>
              {texts.password}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={onChange}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className={labelClass}>
              {texts.confirmPassword}
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={onChange}
              required
              className={inputClass}
            />
          </div>

          {turnstileSlot}

          <button
            type="submit"
            disabled={isLoading}
            className={`${primaryBtnClass} mt-1`}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {texts.registering}
              </>
            ) : (
              texts.register
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {texts.hasAccount}{" "}
          <Link
            href={`/${lang}/login`}
            className="font-medium text-cyan-300 transition-colors hover:text-cyan-200"
          >
            {texts.login}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
