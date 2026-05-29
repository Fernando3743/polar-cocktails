interface IconProps {
  className?: string;
}

/** Facebook glyph: rounded badge + "f" mark. Monoline, currentColor. */
export function FacebookIcon({ className }: IconProps) {
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
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M14.5 8h-1.3c-1 0-1.7.7-1.7 1.7V11H9.8v2h1.7v6" />
      <path d="M11.5 13h2.4" />
    </svg>
  );
}
