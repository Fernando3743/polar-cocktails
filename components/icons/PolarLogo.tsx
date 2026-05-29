interface IconProps {
  className?: string;
}

/**
 * Circular double-ring brand badge:
 *  - ".POLAR." arched across the top via <textPath>
 *  - "COCKTAILS" arched across the bottom via <textPath>
 *  - two dot separators flanking the text
 *  - a centered line-art granizado cup (tumbler + domed lid + straw)
 * Uses currentColor so Tailwind controls the color. Larger viewBox.
 */
export function PolarLogo({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Polar Cocktails"
    >
      <defs>
        {/* Top arc: text reads left-to-right across the upper half. */}
        <path
          id="polar-arc-top"
          d="M 18 50 A 32 32 0 0 1 82 50"
          fill="none"
        />
        {/* Bottom arc: text reads left-to-right across the lower half. */}
        <path
          id="polar-arc-bottom"
          d="M 20 50 A 30 30 0 0 0 80 50"
          fill="none"
        />
      </defs>

      {/* Outer ring */}
      <circle cx="50" cy="50" r="47" stroke="currentColor" strokeWidth="1.6" />
      {/* Inner ring */}
      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1.2" />

      {/* Arched lettering */}
      <text
        fill="currentColor"
        fontFamily="var(--font-poppins, 'Poppins', sans-serif)"
        fontSize="9"
        fontWeight="700"
        letterSpacing="1.6"
      >
        <textPath href="#polar-arc-top" startOffset="50%" textAnchor="middle">
          ·POLAR·
        </textPath>
      </text>
      <text
        fill="currentColor"
        fontFamily="var(--font-poppins, 'Poppins', sans-serif)"
        fontSize="6.6"
        fontWeight="600"
        letterSpacing="2.4"
      >
        <textPath href="#polar-arc-bottom" startOffset="50%" textAnchor="middle">
          COCKTAILS
        </textPath>
      </text>

      {/* Dot separators flanking the lettering */}
      <circle cx="22" cy="35" r="1.4" fill="currentColor" />
      <circle cx="78" cy="35" r="1.4" fill="currentColor" />

      {/* Centered line-art granizado cup */}
      <g
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* Domed lid */}
        <path d="M 41.5 46 Q 50 39 58.5 46" />
        <path d="M 40.5 46 H 59.5" />
        {/* Straw */}
        <path d="M 53.5 44 L 56 33" />
        {/* Tumbler body (slightly tapered) */}
        <path d="M 42 46 L 44 66 Q 44 68 46 68 H 54 Q 56 68 56 66 L 58 46" />
        {/* Granizado fill line */}
        <path d="M 43 54 H 57" />
      </g>
    </svg>
  );
}
