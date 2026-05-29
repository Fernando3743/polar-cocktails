interface IconProps {
  className?: string;
}

/**
 * 6-point snowflake. Defaults to cyan (#7DD3FC) but uses currentColor so a
 * className text color can override it.
 */
export function SnowflakeIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: "var(--color-polar-snow, #7DD3FC)" }}
      aria-hidden="true"
    >
      {/* Vertical spine */}
      <path d="M12 2v20" />
      {/* Diagonal spines */}
      <path d="M4.2 6.5l15.6 9" />
      <path d="M19.8 6.5l-15.6 9" />
      {/* Top/bottom barbs */}
      <path d="M9.5 4.5L12 7l2.5-2.5" />
      <path d="M9.5 19.5L12 17l2.5 2.5" />
      {/* Right barbs */}
      <path d="M16.7 7.3l.6 3.4 3.3-.9" />
      <path d="M16.7 16.7l.6-3.4 3.3.9" />
      {/* Left barbs */}
      <path d="M7.3 7.3l-.6 3.4-3.3-.9" />
      <path d="M7.3 16.7l-.6-3.4-3.3.9" />
    </svg>
  );
}
