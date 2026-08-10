/**
 * 客服/仓库操作台（`/[lang]/admin/console/*`）左侧菜单树 · 单一配置源。
 *
 * 为什么单独开一份、不复用 `admin-sidebar.tsx` 的 menuItems：那份是给"老板经营
 * 仪表盘"（`/[lang]/admin`，供管理层看指标）用的，本菜单服务客服与日本仓库操作员，
 * 是完全不同的用户群体和菜单结构。花哥拍板（2026-08-10）：新开独立路由组，界面
 * 照抄老后台的菜单结构/顺序/术语，不做"顺手现代化"（见外置大脑记忆
 * rewrite-ux-parity-requirement）。
 *
 * 顺序与文案对齐老后台生产 st_menu 实测的真实菜单树：
 * 后台主页/平台配置/会员管理/订单管理/仓库管理/财务管理/活动福利/系统配置/账号管理
 * （老后台"商品管理"已停用，不做）。角色只有 客服/仓库 两种。
 *
 * 迁移进度：当前只有「订单管理 > 押金审批」接了新后台真实功能，其余顶级菜单在
 * 新后台还没有对应页面，disabled=true 并在侧边栏标"迁移中"（不渲染可点链接，
 * 避免指向不存在的页面产生死链接）。「后台主页」是本路由组已经建好的欢迎页
 * （`console/page.tsx`），保留可点，不算"迁移中"的范畴。
 *
 * 以后每接线一个模块，只改这一个文件：把对应项 disabled 改 false、补 href。
 */

export interface ConsoleMenuChild {
  key: string;
  label: string;
  href: string;
  disabled: boolean;
}

export interface ConsoleMenuItem {
  key: string;
  label: string;
  /** 顶级菜单自身的落地页；没有 href 的顶级菜单只作为分类标题（如"订单管理"）。 */
  href?: string;
  disabled: boolean;
  children?: ConsoleMenuChild[];
}

export const CONSOLE_MENU: ConsoleMenuItem[] = [
  {
    key: "home",
    label: "后台主页",
    href: "/admin/console",
    disabled: false,
  },
  {
    key: "platform",
    label: "平台配置",
    disabled: true,
  },
  {
    key: "member",
    label: "会员管理",
    disabled: true,
  },
  {
    key: "order",
    label: "订单管理",
    disabled: false,
    children: [
      {
        key: "deposit-refund",
        label: "押金审批",
        href: "/admin/console/deposits/refunds",
        disabled: false,
      },
    ],
  },
  {
    key: "warehouse",
    label: "仓库管理",
    disabled: true,
  },
  {
    key: "finance",
    label: "财务管理",
    disabled: true,
  },
  {
    key: "activity",
    label: "活动福利",
    disabled: true,
  },
  {
    key: "system",
    label: "系统配置",
    disabled: true,
  },
  {
    key: "account",
    label: "账号管理",
    disabled: true,
  },
];
