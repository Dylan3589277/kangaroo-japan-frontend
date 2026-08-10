/**
 * 客服/仓库操作台首页——空欢迎页 + 迁移进度说明。
 * 无数据请求，保持服务端组件即可，不需要 "use client"。
 */
export default function ConsoleHomePage() {
  return (
    <div className="max-w-2xl space-y-3">
      <h1 className="text-xl font-semibold">欢迎使用客服/仓库操作台</h1>
      <p className="text-sm text-muted-foreground">
        本操作台正在从老后台逐步迁移功能。当前仅「订单管理 &gt; 押金审批」已接入新后台，
        左侧菜单其余项目标注“迁移中”，对应业务请继续在老后台处理，迁移完成后会逐一开放。
      </p>
    </div>
  );
}
