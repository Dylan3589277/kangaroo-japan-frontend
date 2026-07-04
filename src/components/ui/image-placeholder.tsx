/**
 * 通用「无图 / 图挂了」占位块（体面灰卡 + 图片线框图标）。
 * 替代纯文字「暂无图片」占位：视觉上是与卡片同灰系的渐变底 + 居中图标，
 * 可读性文案仅保留给读屏（sr-only，由调用方传各自 i18n 文案）。
 * 尺寸自适应父容器（父容器负责 aspect-ratio / 宽高）。
 */
export function ImagePlaceholder({
  label,
  iconClassName = "h-10 w-10",
}: {
  /** 读屏文案（如「暂无图片」）；不可见但保留可访问性。 */
  label?: string;
  /** 图标尺寸类；列表小卡默认 h-10 w-10，详情大图可传 h-16 w-16。 */
  iconClassName?: string;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
      <svg
        className={`${iconClassName} text-zinc-300`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.6" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m5.5 17 4.1-4.1a1.5 1.5 0 0 1 2.1 0l1.9 1.9 1.6-1.6a1.5 1.5 0 0 1 2.1 0l3.2 3.2"
        />
      </svg>
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  );
}
