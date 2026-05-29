interface IconProps {
  className?: string;
}

/** TikTok glyph: musical note silhouette. Monoline, currentColor. */
export function TikTokIcon({ className }: IconProps) {
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
      <path d="M14 3v10.5a3.5 3.5 0 1 1-3.5-3.5c.35 0 .7.05 1 .15" />
      <path d="M14 3c.4 2.4 2.2 4.2 4.6 4.6" />
    </svg>
  );
}
