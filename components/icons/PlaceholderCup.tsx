import { useId } from "react";

interface PlaceholderCupProps {
  /** Hex color (e.g. "#2EA6E0") that drives the granizado fill + glow. */
  accentColor: string;
  className?: string;
}

/**
 * Lighten a #RRGGBB hex toward white by `amount` (0..1).
 * Falls back to the input string if it isn't a parseable 6-digit hex.
 */
function lighten(hex: string, amount: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return hex;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 0xff;
  const g = (int >> 8) & 0xff;
  const b = int & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const to2 = (c: number) => mix(c).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

/**
 * Stylized granizado cup placeholder — stands in for product / hero photos
 * until real images arrive. A wide tumbler filled with a radial granizado
 * gradient (lightened accent at the top → accent at the bottom) plus crushed-ice
 * blobs, a translucent domed lid, a straw, and a soft glow halo. Transparent bg.
 */
export function PlaceholderCup({ accentColor, className }: PlaceholderCupProps) {
  const uid = useId();
  const fillId = `cupfill-${uid}`;
  const glowId = `cupglow-${uid}`;
  const clipId = `cupclip-${uid}`;
  const top = lighten(accentColor, 0.6);
  const mid = lighten(accentColor, 0.25);

  return (
    <svg
      viewBox="0 0 120 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Granizado"
    >
      <defs>
        <radialGradient id={fillId} cx="40%" cy="20%" r="90%">
          <stop offset="0%" stopColor={top} />
          <stop offset="55%" stopColor={mid} />
          <stop offset="100%" stopColor={accentColor} />
        </radialGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.6" />
          <stop offset="55%" stopColor={accentColor} stopOpacity="0.22" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </radialGradient>
        {/* Clip granizado texture to the cup body */}
        <clipPath id={clipId}>
          <path d="M24 62 L31 132 Q32 142 42 142 L78 142 Q88 142 89 132 L96 62 Z" />
        </clipPath>
      </defs>

      {/* Soft glow halo behind the cup */}
      <ellipse cx="60" cy="86" rx="62" ry="66" fill={`url(#${glowId})`} />

      {/* Straw poking out of the dome */}
      <path
        d="M80 24 L70 60"
        stroke={top}
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Tumbler body filled with the granizado gradient (wide, slight taper) */}
      <path
        d="M24 62 L31 132 Q32 142 42 142 L78 142 Q88 142 89 132 L96 62 Z"
        fill={`url(#${fillId})`}
      />

      {/* Crushed-ice blobs (clipped to the body) */}
      <g clipPath={`url(#${clipId})`}>
        <circle cx="42" cy="78" r="9" fill={top} fillOpacity="0.55" />
        <circle cx="63" cy="72" r="11" fill={top} fillOpacity="0.5" />
        <circle cx="80" cy="82" r="8" fill={top} fillOpacity="0.5" />
        <circle cx="54" cy="92" r="7" fill={top} fillOpacity="0.4" />
        <circle cx="72" cy="98" r="6" fill={top} fillOpacity="0.35" />
        {/* Frosty highlight streak */}
        <path
          d="M36 70 L43 134"
          stroke="#ffffff"
          strokeWidth="5"
          strokeOpacity="0.2"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* Translucent domed lid */}
      <path d="M18 60 Q60 22 102 60 Z" fill="#ffffff" fillOpacity="0.16" />
      <path
        d="M18 60 Q60 22 102 60"
        stroke="#ffffff"
        strokeWidth="2"
        strokeOpacity="0.45"
        fill="none"
      />
      {/* Lid rim */}
      <rect
        x="16"
        y="57"
        width="88"
        height="7"
        rx="3.5"
        fill="#ffffff"
        fillOpacity="0.3"
      />
    </svg>
  );
}
