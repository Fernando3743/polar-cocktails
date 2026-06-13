interface IconProps {
  className?: string;
}

/** Ticket / promo tag glyph for the discount-code UI. */
export function TicketIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 8.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.25a2 2 0 0 0 0 4.5v1.25a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.25a2 2 0 0 0 0-4.5V8.5Z" />
      <path d="M14.5 6.5v11" strokeDasharray="2 2.5" />
    </svg>
  );
}
