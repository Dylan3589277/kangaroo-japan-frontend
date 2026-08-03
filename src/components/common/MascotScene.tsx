import Image from "next/image";

/**
 * 袋鼠君吉祥物插画（zh 站专用）。
 *
 * 小程序在用的 8 张吉祥物插画，自托管在 public/mascot/（不热链老后台）。仅用于 zh 侧
 * 空状态 / 场景化提示，与 en 站的深色 TCG 视觉风格不兼容——调用方必须自行判断
 * `locale === "zh"` 再渲染，本组件不做 locale 判断。
 *
 * 8 张图均为 720x720 正方形，object-cover 不会裁掉主体。
 */

const MASCOT_SOURCES = {
  welcome: "/mascot/welcome.jpg", // 袋鼠+仓鼠挥手打招呼：客服/欢迎
  search: "/mascot/search.jpg", // 袋鼠拿放大镜：搜索无结果
  empty: "/mascot/empty.jpg", // 袋鼠趴购物车打盹：空购物车/空列表
  message: "/mascot/message.jpg", // 袋鼠递信封：消息中心空状态
  deposit: "/mascot/deposit.jpg", // 袋鼠抱存钱罐+金币：押金页
  coupon: "/mascot/coupon.jpg", // 袋鼠+金币：优惠券空状态
  celebrate: "/mascot/celebrate.jpg", // 袋鼠撒彩带庆祝：成功/完成状态
  ship: "/mascot/ship.jpg", // 快递员袋鼠打包纸箱：物流/发货说明
  kefu: "/mascot/kefu.jpg", // 戴耳机客服袋鼠+仓鼠：帮助中心/客服
  sign: "/mascot/sign.jpg", // 袋鼠举日历本：每日签到
} as const;

export type MascotSceneName = keyof typeof MASCOT_SOURCES;

interface MascotSceneProps {
  name: MascotSceneName;
  alt: string;
  /** 正方形边长（px），默认 180，适合空状态区居中展示 */
  size?: number;
  className?: string;
}

export function MascotScene({
  name,
  alt,
  size = 180,
  className = "",
}: MascotSceneProps) {
  return (
    <Image
      src={MASCOT_SOURCES[name]}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className={`mx-auto rounded-2xl object-cover ${className}`}
    />
  );
}
