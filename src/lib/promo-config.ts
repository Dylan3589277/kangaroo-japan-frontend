/**
 * zh 站「当前活动」单一配置源。
 *
 * `/[lang]/fee-calculator` 页的活动横幅从这里取数；以后每月活动更新只改这一个文件，
 * 不要在页面组件里散写活动文案/数字（花哥 2026-08-06 明确要求"单一配置源，便于每月更新"）。
 *
 * 与现有取数逻辑打通的部分：横幅上「代拍手续费是否全免」优先用 `/fee-calculator`
 * 页实际拿到的 `getFeeEstimate()` 实时结果（`levelFeeJpy === 0`）判断，本配置的
 * `agencyFeeWaived` 只在实时数据取不到时兜底展示，避免活动结束了页面还留旧文案。
 *
 * 未打通的部分：代拍汇率/运费汇率/夜间折扣的加点数字，老后台没有能公开查询的
 * "当前加点是多少"端点（只能查到已经算好的最终汇率结果，见 zh-fee-estimate.service.ts
 * 与 fee-estimate.service.ts 头部注释），所以这几行仍是人工同步的文案常量。
 *
 * 🔴 夜间折扣时段（18:00-次日9:00）的时区未经花哥明确（本次任务书未注明 JST 还是
 * 中国时间）——本站过往栽过把"中国时间"客服口径误当 JST 改错全站的坑（见记忆
 * kefu-hours-copy-baseline），本页因此不自动按时段切换计算逻辑，只原样展示文案，
 * 避免猜错时区导致算错价格。若要做成自动生效的价格切换，需先跟花哥确认时区。
 */

export interface ActivePromo {
  id: string;
  /** 生效起止日期，YYYY-MM-DD，均含边界，按本地日期粗粒度比较（非精确到秒）。 */
  startDate: string;
  endDate: string;
  title: string;
  /** 代拍手续费是否全免——仅作实时数据不可用时的兜底展示，见上方文件头注释。 */
  agencyFeeWaived: boolean;
  agencyFeeNominalJpy: number;
  agencyRateAddText: string;
  shippingRateAddText: string;
  nightDiscountText: string;
}

export const CURRENT_PROMO: ActivePromo = {
  id: "2026-08",
  startDate: "2026-08-01",
  endDate: "2026-08-31",
  title: "8月活动",
  agencyFeeWaived: true,
  agencyFeeNominalJpy: 200,
  agencyRateAddText: "代拍汇率：实时 + 0.0025",
  shippingRateAddText: "运费汇率：实时 + 0.003",
  nightDiscountText:
    "夜间 18:00-次日 9:00 汇率仅加 0.0023（仅限煤炉自助支付/自动下单）",
};

/**
 * 当前是否命中活动窗口。用 UTC 日期做粗粒度比较——月级别的活动窗口，
 * 时区带来的边界误差最多几小时，不影响"该不该显示这条活动横幅"这个判断。
 */
export function getActivePromo(referenceDate: Date = new Date()): ActivePromo | null {
  const ymd = referenceDate.toISOString().slice(0, 10);
  if (ymd < CURRENT_PROMO.startDate || ymd > CURRENT_PROMO.endDate) return null;
  return CURRENT_PROMO;
}
