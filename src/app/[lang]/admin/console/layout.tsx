"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONSOLE_MENU } from "@/lib/console-menu";
import { useAuthStore } from "@/lib/auth";
import { loginPathWithNext } from "@/lib/login-redirect";
import { cn } from "@/lib/utils";

/**
 * 客服/仓库操作台外壳：顶栏(系统名+当前账号+退出) + 左侧菜单树。
 *
 * 风格朴素贴近老后台（传统后台表格风），与 `/[lang]/admin` 那套"老板经营仪表盘"
 * 布局刻意不同——那边服务管理层看指标，这里服务客服/仓库操作员的日常操作，
 * 界面照抄老后台以减少上手成本（花哥拍板，见 console-menu.ts 顶部注释）。
 *
 * 认证复用既有 admin JWT 登录栈（不新做登录页）：`useAuthStore` 判断是否已登录，
 * 未登录跳 `/{lang}/login?next=...`（与 `/[lang]/warehouse/page.tsx` 的守卫同一套写法）。
 */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const lang = (params.lang as string) || "zh";
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(loginPathWithNext(lang));
    }
  }, [isLoading, isAuthenticated, lang, router]);

  function handleLogout() {
    logout();
    router.push(loginPathWithNext(lang));
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        加载中...
      </div>
    );
  }

  if (!isAuthenticated) {
    // useEffect 已触发跳转登录页，这里只是避免瞬时渲染受保护内容。
    return null;
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="w-56 shrink-0 border-r bg-background">
        <div className="flex h-14 items-center border-b px-4 text-sm font-semibold">
          客服/仓库操作台
        </div>
        <nav className="p-2 text-sm">
          {CONSOLE_MENU.map((item) => {
            const itemHref = item.href ? `/${lang}${item.href}` : undefined;
            const itemActive = itemHref ? pathname === itemHref : false;
            return (
              <div key={item.key} className="mb-1">
                {itemHref && !item.disabled ? (
                  <Link
                    href={itemHref}
                    className={cn(
                      "flex items-center justify-between rounded-md px-3 py-2",
                      itemActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <div className="flex items-center justify-between rounded-md px-3 py-2 text-muted-foreground">
                    <span>{item.label}</span>
                    {item.disabled ? (
                      <Badge
                        variant="outline"
                        className="border-slate-200 bg-slate-100 text-[10px] text-slate-500"
                      >
                        迁移中
                      </Badge>
                    ) : null}
                  </div>
                )}
                {item.children?.length ? (
                  <div className="ml-3 border-l pl-2">
                    {item.children.map((child) => {
                      const childHref = `/${lang}${child.href}`;
                      const childActive = pathname === childHref;
                      return child.disabled ? (
                        <div
                          key={child.key}
                          className="flex items-center justify-between rounded-md px-3 py-1.5 text-muted-foreground"
                        >
                          <span>{child.label}</span>
                          <Badge
                            variant="outline"
                            className="border-slate-200 bg-slate-100 text-[10px] text-slate-500"
                          >
                            迁移中
                          </Badge>
                        </div>
                      ) : (
                        <Link
                          key={child.key}
                          href={childHref}
                          className={cn(
                            "block rounded-md px-3 py-1.5",
                            childActive
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-foreground hover:bg-muted",
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background px-6">
          <span className="text-sm font-medium">袋鼠君客服/仓库操作台</span>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{user?.name || user?.email || "未登录"}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="h-3.5 w-3.5" />
              退出
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
