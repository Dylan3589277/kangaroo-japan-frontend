"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

function getCopy(lang: string) {
  if (lang === "en") {
    return {
      title: "Reset password",
      desc: "Enter your email and we will send reset instructions if the account exists.",
      email: "Email",
      submit: "Send reset email",
      sent: "If this account exists, reset instructions have been sent.",
      back: "Back to login",
    };
  }
  if (lang === "ja") {
    return {
      title: "\u30d1\u30b9\u30ef\u30fc\u30c9\u518d\u8a2d\u5b9a",
      desc: "\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9\u3092\u5165\u529b\u3059\u308b\u3068\u3001\u30a2\u30ab\u30a6\u30f3\u30c8\u304c\u5b58\u5728\u3059\u308b\u5834\u5408\u306b\u518d\u8a2d\u5b9a\u624b\u9806\u3092\u9001\u4fe1\u3057\u307e\u3059\u3002",
      email: "\u30e1\u30fc\u30eb",
      submit: "\u518d\u8a2d\u5b9a\u30e1\u30fc\u30eb\u3092\u9001\u4fe1",
      sent: "\u30a2\u30ab\u30a6\u30f3\u30c8\u304c\u5b58\u5728\u3059\u308b\u5834\u5408\u3001\u518d\u8a2d\u5b9a\u624b\u9806\u3092\u9001\u4fe1\u3057\u307e\u3057\u305f\u3002",
      back: "\u30ed\u30b0\u30a4\u30f3\u306b\u623b\u308b",
    };
  }
  return {
    title: "\u627e\u56de\u5bc6\u7801",
    desc: "\u8f93\u5165\u90ae\u7bb1\uff0c\u5982\u679c\u8d26\u53f7\u5b58\u5728\uff0c\u6211\u4eec\u4f1a\u53d1\u9001\u91cd\u7f6e\u6307\u5f15\u3002",
    email: "\u90ae\u7bb1",
    submit: "\u53d1\u9001\u91cd\u7f6e\u90ae\u4ef6",
    sent: "\u5982\u679c\u8d26\u53f7\u5b58\u5728\uff0c\u91cd\u7f6e\u6307\u5f15\u5df2\u53d1\u9001\u3002",
    back: "\u8fd4\u56de\u767b\u5f55",
  };
}

export default function ForgotPasswordPage() {
  const params = useParams();
  const lang = (params.lang as string) || "zh";
  const copy = getCopy(lang);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await api.forgotPassword(email);
    } finally {
      setSent(true);
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 via-white to-orange-50 px-4 py-10">
      <Card className="w-full max-w-md border-zinc-200/80 shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-20 w-24 items-center justify-center">
            <Image src="/brand/kangaroo-logo.svg" alt="kangaroo" width={96} height={72} priority className="h-20 w-auto" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">{copy.title}</CardTitle>
            <CardDescription className="mt-2 text-sm leading-6 text-zinc-600">{copy.desc}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {sent ? (
            <div className="rounded-md bg-green-50 p-4 text-sm leading-6 text-green-700">{copy.sent}</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{copy.email}</Label>
                <Input id="email" type="email" placeholder="example@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{copy.submit}</> : copy.submit}
              </Button>
            </form>
          )}
          <p className="text-center text-sm text-zinc-600">
            <Link href={`/${lang}/login`} className="font-medium text-rose-600 hover:underline">{copy.back}</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
