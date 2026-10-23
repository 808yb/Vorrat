import { type ReactNode, type CSSProperties } from "react";

export type IconName =
  | "archive"
  | "barcode"
  | "book"
  | "bookmark"
  | "bookmarkFilled"
  | "calendar"
  | "camera"
  | "cart"
  | "chart"
  | "check"
  | "chef"
  | "chevron"
  | "clock"
  | "close"
  | "flashlight"
  | "flame"
  | "leaf"
  | "mic"
  | "minus"
  | "pencil"
  | "plus"
  | "receipt"
  | "search"
  | "shuffle"
  | "sparkles"
  | "star"
  | "sync"
  | "timer"
  | "user"
  | "wand"
  | "trash"
  | "alert"
  | "dice"
  | "moon"
  | "fridge"
  | "snowflake"
  | "can"
  | "bottle"
  | "package";

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
  className = "",
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const paths: Record<IconName, ReactNode> = {
    archive: (
      <>
        <path d="M4 7.5h16v12H4z" />
        <path d="M3 4.5h18v3H3zM9 11h6" />
      </>
    ),
    barcode: (
      <>
        <path d="M4 5v14M7 5v14M11 5v14M13.5 5v14M17 5v14M20 5v14" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
        <path d="M6 6h10" />
        <path d="M6 10h10" />
      </>
    ),
    bookmark: (
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    ),
    bookmarkFilled: (
      <path fill="currentColor" d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
    camera: (
      <>
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </>
    ),
    flashlight: (
      <>
        <path d="M18 6c0 2-2 4-2 7v5a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5c0-3-2-5-2-7V2h12v4z" />
        <line x1="6" y1="6" x2="18" y2="6" />
        <line x1="12" y1="12" x2="12" y2="12.01" />
      </>
    ),
    cart: (
      <>
        <path d="M3 4h2l2.3 10.5h10.9L21 7H6" />
        <circle cx="9" cy="19" r="1.2" />
        <circle cx="18" cy="19" r="1.2" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="M18 17V9" />
        <path d="M13 17V5" />
        <path d="M8 17v-3" />
      </>
    ),
    flame: (
      <>
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chef: (
      <>
        <path d="M7 11v8h10v-8" />
        <path d="M7.2 12A4 4 0 0 1 9 4.5 4 4 0 0 1 16.8 6 3.2 3.2 0 0 1 17 12H7.2ZM9 15h6" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
    close: <path d="M6 6l12 12M18 6 6 18" />,
    leaf: (
      <>
        <path d="M19 4C11 4 6 8.5 6 14c0 3 2.4 5 5 5 6 0 8-7 8-15Z" />
        <path d="M5 20c2-5 5.5-8.5 10-11" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="4" width="6" height="11" rx="3" />
        <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3M9 20h6" />
      </>
    ),
    minus: <path d="M6 12h12" />,
    pencil: (
      <>
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </>
    ),
    plus: <path d="M12 6v12M6 12h12" />,
    receipt: (
      <>
        <path d="M6 3v18l3-2 3 2 3-2 3 2V3l-3 2-3-2-3 2-3-2Z" />
        <path d="M9 9h6M9 13h6" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 4 4" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3Z" />
        <path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" />
      </>
    ),
    star: (
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    ),
    shuffle: (
      <>
        <path d="M16 3h5v5M4 20l17-17M21 16v5h-5M15 15l6 6M4 4l5 5" />
      </>
    ),
    sync: (
      <>
        <path d="M20 7h-5V2" />
        <path d="M19 7a8 8 0 0 0-13.8-1.8L3 7.5M4 17h5v5" />
        <path d="M5 17a8 8 0 0 0 13.8 1.8l2.2-2.3" />
      </>
    ),
    timer: (
      <>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2" />
        <path d="M10 2h4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c.7-4 3.2-6 7-6s6.3 2 7 6" />
      </>
    ),
    wand: (
      <>
        <path d="m4 20 10.5-10.5M12.5 7.5l4 4" />
        <path d="m18 3 .7 2.3L21 6l-2.3.7L18 9l-.7-2.3L15 6l2.3-.7L18 3Z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </>
    ),
    alert: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4M12 16h.01" />
      </>
    ),
    dice: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8" cy="8" r="1.2" fill="currentColor" />
        <circle cx="16" cy="16" r="1.2" fill="currentColor" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" />
        <circle cx="16" cy="8" r="1.2" fill="currentColor" />
        <circle cx="8" cy="16" r="1.2" fill="currentColor" />
      </>
    ),
    moon: (
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    ),
    fridge: (
      <>
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="5" y1="10" x2="19" y2="10" />
        <line x1="9" y1="6" x2="9" y2="8" />
        <line x1="9" y1="14" x2="9" y2="17" />
      </>
    ),
    snowflake: (
      <>
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="m20 16-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4" />
      </>
    ),
    can: (
      <>
        <path d="M5 6a7 3 0 1 0 14 0A7 3 0 1 0 5 6Z" />
        <path d="M5 6v12c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
        <path d="M5 12c0 1.66 3.13 3 7 3s7-1.34 7-3" />
      </>
    ),
    bottle: (
      <>
        <path d="M10 2h4v3h-4z" />
        <path d="M10 5a4 4 0 0 0-4 4v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9a4 4 0 0 0-4-4h-4z" />
      </>
    ),
    package: (
      <>
        <path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    >
      {paths[name]}
    </svg>
  );
}

export type ButtonProps = {
  children?: ReactNode;
  className?: string;
  icon?: IconName;
  onClick?: () => void;
  title?: string;
  style?: CSSProperties;
  disabled?: boolean;
};

export function Button({ children, className = "", icon, onClick, title, style, disabled }: ButtonProps) {
  return (
    <button className={className} onClick={onClick} title={title} type="button" style={style} disabled={disabled}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}
