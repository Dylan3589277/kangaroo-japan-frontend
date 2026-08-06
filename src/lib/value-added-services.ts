// 增值服务价目表（老后台 `st_value_added` 表）—— 兜底快照，不是正常路径。
//
// 正常路径：`/fee-calculator` 页服务端渲染时实时拉 `src/lib/server/value-added.ts`
// 的 `GET https://app.kangaroo-japan.com/api/index/valueadded`（老后台「系统配置-
// 常量配置-增值服务价格」Tab 可自助改价，改后立即生效、无缓存）。本文件只在那次
// 实时请求失败（超时/非 2xx/响应字段不合规）时被 `value-added.ts` 拿来兜底，本身
// 不再是唯一真源，取值日期 2026-08-06（当时经 M4 跳板只读核实生产库），之后价格
// 如有变动无需更新此文件也能反映到页面上——只有希望兜底值更贴近现价时才需要重新
// 核对更新。
//
// 核对方法（供后人复核，经 M4 跳板只读查生产库；命令含 sed 正则里的 `*` `/` 组合，
// 写成 // 行注释而非 /** */ 块注释是为了避免误触块注释提前闭合）：
// ssh macmini "ssh daishujun-ecs-readonly 'cd /home/wwwroot/daishujun && PW=\$(grep \"^PASSWORD\" .env | sed \"s/PASSWORD *= *//\") && mysql -uroot -p\"\$PW\" daishujun -e \"SELECT id,name,price,type FROM st_value_added ORDER BY id;\"'"
//
// `type` 语义（决定顾客在哪个环节勾选，也决定计费单位）：
// - `order`：下单时可选，按每件商品计一份，见老后台 `app/api/controller/Carts.php`。
// - `ship`：出库/发货时可选，按每次发货计一份（不随件数翻倍），见老后台
//   `app/api/controller/Stores.php`。
//
// 与 `src/lib/api.ts` 里 `MercariQuoteValueAdded`（`{id, name, priceJpy}`）是同一批
// `st_value_added` 数据在不同场景的两种消费方式：那边是登录后按真实订单号向后端要的
// 实时报价（购买场景，用于 mercari-checkout），这里是 `/fee-calculator` 匿名试算页用的
// 静态快照（该页无订单号可查，详见 `fee-calculator/PROJECT.md` "已知数据缺口"一节）。
// 字段命名对齐，互不依赖。

export type ValueAddedServiceType = "order" | "ship";

export interface ValueAddedService {
  id: number;
  name: string;
  priceJpy: number;
  type: ValueAddedServiceType;
}

/** type = 'order'：下单时可选，每件商品一份。 */
export const ORDER_VALUE_ADDED_SERVICES: ValueAddedService[] = [
  { id: 5, name: "错发漏发检查服务", priceJpy: 200, type: "order" },
  { id: 6, name: "入库前拍照服务", priceJpy: 200, type: "order" },
];

/** type = 'ship'：出库/发货时可选，每次发货一份。 */
export const SHIP_VALUE_ADDED_SERVICES: ValueAddedService[] = [
  { id: 1, name: "打包带", priceJpy: 230, type: "ship" },
  { id: 2, name: "防水膜", priceJpy: 230, type: "ship" },
  { id: 3, name: "中箱", priceJpy: 570, type: "ship" },
  { id: 4, name: "大箱", priceJpy: 1130, type: "ship" },
];

export const ALL_VALUE_ADDED_SERVICES: ValueAddedService[] = [
  ...ORDER_VALUE_ADDED_SERVICES,
  ...SHIP_VALUE_ADDED_SERVICES,
];
