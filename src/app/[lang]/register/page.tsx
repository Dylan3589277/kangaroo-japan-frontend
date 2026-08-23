"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { RegisterTcgView } from "@/components/auth/auth-tcg";
import { Turnstile } from "@/components/auth/turnstile";

function getRegisterSubtitle(lang: string): string {
  if (lang === "en") {
    return "Committed to becoming a truly useful and affordable Japan proxy shopping service.";
  }
  return "";
}

export default function RegisterPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const lang = (params.lang as string) || "zh";
  // en 走设计方向 A 深色呈现，其它语言保持现有渲染。仅影响视觉，业务逻辑共用。
  const isEn = lang === "en";
  const login = useAuthStore((state) => state.login);

  // 客服发给小程序会员的注册链接：?bindUid=<数字>&ts=<数字>&sig=<hex64>。
  // 三者齐全且格式合法才视为有效绑定请求，随注册请求透传给后端做注册即绑。
  const legacyBindUid = searchParams.get("bindUid");
  const legacyBindTs = searchParams.get("ts");
  const legacyBindSig = searchParams.get("sig");
  const hasLegacyBind =
    !!legacyBindUid &&
    !!legacyBindTs &&
    !!legacyBindSig &&
    /^\d+$/.test(legacyBindUid) &&
    /^\d+$/.test(legacyBindTs) &&
    /^[0-9a-fA-F]{64}$/.test(legacyBindSig);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Turnstile token：未配置 site key 时恒为 null，不阻断注册（优雅降级）。
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    if (formData.password.length < 8) {
      setError(t("passwordMinLength"));
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone || undefined,
        turnstileToken,
        ...(hasLegacyBind
          ? {
              legacyBindUid: legacyBindUid!,
              legacyBindTs: legacyBindTs!,
              legacyBindSig: legacyBindSig!,
            }
          : {}),
      }) as {
        success: boolean;
        data?: {
          user: Parameters<typeof login>[0];
          tokens: { access_token: string };
          legacyBound?: boolean;
        };
        error?: { message: string };
      };

      if (response.success && response.data) {
        login(response.data.user, response.data.tokens.access_token);
        if (hasLegacyBind) {
          if (response.data.legacyBound) {
            toast.success(`${t("registerSuccess")}${isEn ? ". " : "，"}${t("legacyBoundSuccess")}`);
          } else {
            toast.error(t("legacyBoundFailed"));
          }
        }
        router.push("/");
      } else {
        const msg = response.error?.message;
        // 人机验证失败：后端硬编码英文串，前端映射到本地化文案，避免向用户直吐英文。
        setError(
          msg === "Captcha verification failed"
            ? t("captchaFailed")
            : msg || t("registerFailed"),
        );
      }
    } catch {
      setError(t("registerFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  if (isEn) {
    // 设计 A 深色注册：字段/校验/提交/注册即绑(后端)/跳转回调全部沿用上方逻辑，只换视觉。
    return (
      <RegisterTcgView
        texts={{
          title: t("register"),
          subtitle: getRegisterSubtitle(lang),
          hasAccount: t("hasAccount"),
          login: t("login"),
          name: t("name"),
          email: t("email"),
          phone: t("phone"),
          password: t("password"),
          confirmPassword: t("confirmPassword"),
          register: t("register"),
          registering: t("registering"),
        }}
        lang={lang}
        formData={formData}
        error={error}
        isLoading={isLoading}
        onChange={handleChange}
        onSubmit={handleSubmit}
        turnstileSlot={<Turnstile onToken={setTurnstileToken} theme="dark" language={lang} className="flex justify-center" />}
        legacyBindHint={hasLegacyBind ? t("legacyBindHint", { uid: legacyBindUid }) : undefined}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t("register")}
          </CardTitle>
          <CardDescription className="text-center">
            {t("hasAccount")}{" "}
            <Link href="/login" className="text-primary hover:underline">
              {t("login")}
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {hasLegacyBind && (
              <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-md">
                {t("legacyBindHint", { uid: legacyBindUid })}
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-500 text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+86 138 0000 0000"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <Turnstile onToken={setTurnstileToken} language={lang} className="flex justify-center" />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "..." : t("register")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
