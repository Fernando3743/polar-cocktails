interface IconProps {
  className?: string;
}

/** Granizado cup glyph: tapered tumbler + domed lid + straw. Monoline. */
export function CupIcon({ className }: IconProps) {
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
      aria-hidden="true"
    >
      {/* Domed lid */}
      <path d="M7 7q5-4.2 10 0" />
      <path d="M6.4 7h11.2" />
      {/* Straw */}
      <path d="M14.5 5.3L16.6 1.5" />
      {/* Tumbler body */}
      <path d="M7.4 7l1.3 13.2Q8.8 22 10.4 22h3.2q1.6 0 1.7-1.8L16.6 7" />
      {/* Granizado fill line */}
      <path d="M8 12.5h8" />
    </svg>
  );
}
