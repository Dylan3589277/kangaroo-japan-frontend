"use client";

import { Fragment } from "react";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { MascotScene } from "@/components/common/MascotScene";

/**
 * zh 首页「三步流程图解」区块（第二批视觉专业化新增）。
 * 放在搜索区之后、Banner 之前。桌面横排 + 箭头连线，移动端竖排。
 * 文案与 /how-it-works 的四步流程口径一致（这里合并为三步，简化首屏阅读）。
 */

// 2026-08-04 花哥拍板：三步图标统一用袋鼠吉祥物（原来只有第 3 步是袋鼠，混搭线性图标突兀）。
// 三张图正好讲完整故事：放大镜找货 → 打包合箱 → 收货庆祝。
const STEPS = [
  {
    mascot: "search",
    title: "搜索或发链接给客服",
    body: "站内搜索心仪商品，或把商品链接发给客服，我们帮你确认价格和库存。",
  },
  {
    mascot: "ship",
    title: "日本代购代拍，入仓可验货合箱",
    body: "日本团队为你下单或代为竞拍，商品到仓后可申请拍照验货，多件合箱省运费。",
  },
  {
    mascot: "celebrate",
    title: "国际直邮到家",
    body: "称重结算运费后安排发货，EMS / 海运 / 经济小包多种方式，全程可查物流。",
  },
] as const;

export function ZhHowItWorksStrip() {
  return (
    <section className="pb-6">
      <div className="mx-auto w-full max-w-7xl px-4">
        <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-3">
            {STEPS.map((step, i) => (
              <Fragment key={step.title}>
                <div className="flex flex-1 items-start gap-4 sm:flex-col sm:items-center sm:gap-2 sm:text-center">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-rose-50">
                    <MascotScene name={step.mascot} alt={step.title} size={56} />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-zinc-900">
                      <span className="mr-1 text-rose-500">{i + 1}.</span>
                      {step.title}
                    </span>
                    <span className="text-xs leading-snug text-zinc-500">
                      {step.body}
                    </span>
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <ArrowRight
                    className="hidden h-5 w-5 shrink-0 text-zinc-300 sm:block"
                    strokeWidth={1.75}
                  />
                )}
              </Fragment>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 border-t border-zinc-100 pt-4">
            <Link
              href="/how-it-works"
              className="text-xs font-medium text-rose-600 hover:text-rose-700"
            >
              查看完整流程 →
            </Link>
            <span className="text-zinc-200">|</span>
            <Link
              href="/fee-compare"
              className="text-xs font-medium text-rose-600 hover:text-rose-700"
            >
              费用说明 →
            </Link>
            <span className="text-zinc-200">|</span>
            <Link
              href="/fee-calculator"
              className="text-xs font-medium text-rose-600 hover:text-rose-700"
            >
              费用试算 →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
