import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  ClipboardList,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const legacyRoutes = [
  {
    permissionId: 110,
    route: "chat/index",
    title: "AI客服测试 / 会话查看",
    description: "查看 Hermes 会话、知识库命中、fallback 原因。",
    risk: "只读",
    href: "/admin/support",
  },
  {
    permissionId: 111,
    route: "chat/gpt",
    title: "Hermes草稿 / 发送动作",
    description: "生成草稿、人工审阅、二次确认后发送。仓库角色不得默认获得高风险发送能力。",
    risk: "高风险写动作",
    href: "/admin/support",
  },
  {
    permissionId: 115,
    route: "consults/index",
    title: "代拍咨询工单",
    description: "对应旧 st_order_consults 列表，保留未处理上限 3 条和企业微信提醒语义。",
    risk: "只读",
    href: "/admin/support",
  },
  {
    permissionId: 116,
    route: "consults/handle",
    title: "代拍咨询处理",
    description: "处理咨询状态、结果备注、审计记录；不直接承诺退款或发货时间。",
    risk: "中风险写动作",
    href: "/admin/support",
  },
];

const fallbackItems = [
  "首页 openKefu() 继续走企业微信客服，不接 Hermes。",
  "pages/bundle/realkefu/realkefu.vue 继续保留 wx.openCustomerServiceChat / open-type=contact。",
  "Hermes 离线、超时、知识库外问题、退款承诺、发货承诺、他人订单问题必须转人工。",
  "最终审核前不部署到阿里云，不影响袋鼠君线上小程序。",
];

export default function AdminLegacyKefuPage({
  params,
}: {
  params: { lang: string };
}) {
  const lang = params.lang || "zh";

  return (
    <main className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquareText className="h-4 w-4" />
          袋鼠君旧后台语义适配
        </div>
        <h1 className="mt-2 text-2xl font-semibold">客服模块</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          本页不是新的 /admin/support 交付语义，而是把现代 support 能力映射回袋鼠君旧后台菜单：
          chat/index、chat/gpt、consults/index、consults/handle。
        </p>
      </div>

      <Card className="border-orange-200 bg-orange-50/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <ShieldCheck className="h-5 w-5" />
            生产锁
          </CardTitle>
          <CardDescription className="text-orange-800">
            当前实现只用于本地/Preview 验证。未获得花哥最终审核前，不部署到阿里云服务器，不改线上小程序包。
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        {legacyRoutes.map((item) => (
          <Card key={item.permissionId}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription className="mt-1">
                    旧路由：<code>{item.route}</code>
                  </CardDescription>
                </div>
                <Badge variant={item.risk === "只读" ? "secondary" : "outline"}>
                  权限 {item.permissionId}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">{item.description}</p>
              <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                <span>{item.risk}</span>
                <Link
                  href={`/${lang}${item.href}`}
                  className="text-orange-600 underline-offset-4 hover:underline"
                >
                  打开本地工作台
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI/H5 客服链路
            </CardTitle>
            <CardDescription>
              商品详情页进入 pages/bundle/kefu/kefu.vue，继续调用 api/chat/getkefu。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>保留参数：gid、shop/type。</p>
            <p>返回字段：data.url 兼容旧 WebView。</p>
            <p>Hermes 可用时返回自有 H5，会话中保留 sourceGoodsId/sourcePlatform。</p>
            <p>Hermes 不可用时 fallback 到旧 AI/H5 或真人客服。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              代拍咨询工单
            </CardTitle>
            <CardDescription>
              st_order_consults 迁入 support ticket 时保留旧业务约束。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>未处理咨询上限：3 条。</p>
            <p>字段映射：url/remark/result/status/order_id。</p>
            <p>处理动作必须落审计，不自动向买家发送未审阅内容。</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            53KF / 企业微信兜底不触碰
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            {fallbackItems.map((item) => (
              <li key={item} className="rounded-md border bg-background p-3">
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
