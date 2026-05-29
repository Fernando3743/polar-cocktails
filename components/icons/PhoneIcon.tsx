interface IconProps {
  className?: string;
}

/** Telephone handset glyph. Monoline, currentColor. */
export function PhoneIcon({ className }: IconProps) {
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
      <path d="M6.5 3h3l1.5 4-2 1.4a11 11 0 0 0 4.6 4.6L15.5 15l4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3 6.6 1.5 1.5 0 0 1 4.5 5z" />
    </svg>
  );
}
