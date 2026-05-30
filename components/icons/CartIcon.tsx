interface IconProps {
  className?: string;
}

/** Shopping cart glyph for cart and checkout actions. */
export function CartIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 4.5h2.2l2.1 11.1a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.5l1.4-6.5H7" />
      <path d="M9.2 20.5h.1" />
      <path d="M17.2 20.5h.1" />
      <circle cx="9.2" cy="20.5" r="1.1" />
      <circle cx="17.2" cy="20.5" r="1.1" />
    </svg>
  );
}
