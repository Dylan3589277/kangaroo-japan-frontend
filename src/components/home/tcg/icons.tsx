import type { SVGProps } from "react";

/**
 * 自有内联图标集（lucide 风格 stroke 线条），不引入官方 TCG logo/卡图，规避版权。
 * 统一 24x24、currentColor、stroke-width 1.6，配深色高级感主题。
 */
type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h2.2l2.1 12.4a1.6 1.6 0 0 0 1.6 1.3h9.1a1.6 1.6 0 0 0 1.6-1.2L21.4 7H6" />
    </svg>
  );
}

export function InspectIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m9 11 2 2 4-4" />
      <path d="M12 3 4 6v6c0 4.5 3.4 7.7 8 9 4.6-1.3 8-4.5 8-9V6l-8-3Z" />
    </svg>
  );
}

export function ShipIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2 16.5 4 11h13.5l2.5 5.5" />
      <path d="M2 16.5h20" />
      <path d="M12 11V6h4l3 5" />
      <circle cx="7" cy="19" r="1.3" />
      <circle cx="17" cy="19" r="1.3" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 4 6v6c0 4.5 3.4 7.7 8 9 4.6-1.3 8-4.5 8-9V6l-8-3Z" />
    </svg>
  );
}

export function TranslateIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5h7" />
      <path d="M7 3v2c0 4-2 6-4 7" />
      <path d="M5 9c0 2.5 2.5 4.5 5 5.5" />
      <path d="m12 20 4-9 4 9" />
      <path d="M13.5 17h5" />
    </svg>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7H7l1.5-2h7L17 7h2.5A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  );
}

export function PackageIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
      <path d="M3 8l9 5 9-5" />
      <path d="M12 13v8" />
      <path d="m7.5 5.5 9 5" />
    </svg>
  );
}

export function BoxesIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 9 8 6.5 13 9v5l-5 2.5L3 14Z" />
      <path d="m8 6.5 5-2.5 5 2.5v5l-5 2.5" />
      <path d="M3 9v5" />
    </svg>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 3.5h14v17l-2.3-1.4-2.3 1.4-2.4-1.4L9.6 20.5 7.3 19 5 20.5Z" />
      <path d="M8.5 8h7" />
      <path d="M8.5 12h7" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14" />
    </svg>
  );
}
