"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { LoginTcgView } from "@/components/auth/auth-tcg";
import { Turnstile } from "@/components/auth/turnstile";

const SOCIAL_ERROR_LABELS: Record<string, string> = {
  wechat_not_configured: "WeChat login is not configured yet.",
  alipay_not_configured: "Alipay login is not configured yet.",
  google_not_configured: "Google login is not configured yet.",
  unsupported_provider: "Unsupported login provider.",
};

function getLoginCopy(lang: string) {
  if (lang === "en") {
    return {
      slogan: "Committed to becoming a truly useful and affordable Japan proxy shopping service.",
      forgot: "Forgot password?",
    };
  }
  if (lang === "ja") {
    return {
      slogan: "\u672c\u5f53\u306b\u4f7f\u3044\u3084\u3059\u304f\u3001\u5b89\u3044\u65e5\u672c\u4ee3\u884c\u8cfc\u5165\u30b5\u30fc\u30d3\u30b9\u3092\u76ee\u6307\u3057\u307e\u3059\u3002",
      forgot: "\u30d1\u30b9\u30ef\u30fc\u30c9\u3092\u304a\u5fd8\u308c\u3067\u3059\u304b\uff1f",
    };
  }
  return {
    slogan: "\u81f4\u529b\u6210\u4e3a\u771f\u6b63\u597d\u7528\u4fbf\u5b9c\u7684\u65e5\u672c\u4ee3\u62cd",
    forgot: "\u5fd8\u8bb0\u5bc6\u7801\uff1f",
  };
}

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const lang = (params.lang as string) || "zh";
  const copy = getLoginCopy(lang);
  // en 走设计方向 A 深色呈现，其它语言保持现有渲染。仅影响视觉，业务逻辑共用。
  const isEn = lang === "en";
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") ? SOCIAL_ERROR_LABELS[searchParams.get("error") || ""] || t("loginFailed") : "");
  const [isLoading, setIsLoading] = useState(false);
  // Turnstile token：未配置 site key 时恒为 null，不阻断登录（优雅降级）。
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await api.login(email, password, turnstileToken) as {
        success: boolean;
        data?: { user: Parameters<typeof login>[0]; tokens: { access_token: string } };
        error?: { message: string };
      };

      if (response.success && response.data) {
        login(response.data.user, response.data.tokens.access_token);
        router.push(`/${lang}`);
      } else {
        const msg = response.error?.message;
        // 人机验证失败：后端硬编码英文串，前端映射到本地化文案，避免向用户直吐英文。
        setError(
          msg === "Captcha verification failed"
            ? t("captchaFailed")
            : msg || t("invalidCredentials"),
        );
      }
    } catch {
      setError(t("loginFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  if (isEn) {
    // 设计 A 深色登录：邮箱/密码/提交/校验/跳转回调全部沿用上方逻辑，只换视觉。
    return (
      <LoginTcgView
        texts={{
          title: t("login"),
          subtitle: copy.slogan,
          email: t("email"),
          password: t("password"),
          forgot: copy.forgot,
          login: t("login"),
          loggingIn: t("loggingIn"),
          noAccount: t("noAccount"),
          register: t("register"),
        }}
        lang={lang}
        email={email}
        password={password}
        error={error}
        isLoading={isLoading}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleSubmit}
        turnstileSlot={<Turnstile onToken={setTurnstileToken} theme="dark" language={lang} className="flex justify-center" />}
      />
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 via-white to-orange-50 px-4 py-10">
      <Card className="w-full max-w-md border-zinc-200/80 shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-20 w-24 items-center justify-center">
            <Image src="/brand/kangaroo-logo.png" alt="kangaroo" width={80} height={80} priority className="h-20 w-20 object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">{t("login")}</CardTitle>
            <CardDescription className="mt-2 text-sm leading-6 text-zinc-600">{copy.slogan}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-500">{error}</div>}

            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" type="email" placeholder="example@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password">{t("password")}</Label>
                <Link href={`/${lang}/forgot-password`} className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline">
                  {copy.forgot}
                </Link>
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <Turnstile onToken={setTurnstileToken} language={lang} className="flex justify-center" />

            <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("loggingIn")}</> : t("login")}
            </Button>
          </form>

          <p className="text-center text-sm text-zinc-600">
            {t("noAccount")} <Link href={`/${lang}/register`} className="font-medium text-rose-600 hover:underline">{t("register")}</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
