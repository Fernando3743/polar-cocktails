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
        <path d="M 40.5 45.5 Q 50 37.5 59.5 45.5" />
        <path d="M 39.5 45.5 H 60.5" />
        {/* Straw */}
        <path d="M 53.5 43 L 56.5 32" />
        {/* Tumbler body (fuller, slightly tapered) */}
        <path d="M 40.5 45.5 L 43 67 Q 43 69 45 69 H 55 Q 57 69 57 67 L 59.5 45.5" />
        {/* Granizado fill line */}
        <path d="M 42 54 H 58" />
      </g>
      {/* Granizado bubble texture below the fill line */}
      <g fill="currentColor">
        <circle cx="47" cy="59" r="1.2" />
        <circle cx="51.5" cy="61.5" r="1" />
        <circle cx="53" cy="57.5" r="1.1" />
        <circle cx="48.5" cy="63.5" r="0.9" />
      </g>
    </svg>
  );
}
