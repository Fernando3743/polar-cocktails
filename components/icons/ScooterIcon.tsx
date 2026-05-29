interface IconProps {
  className?: string;
}

/** Delivery scooter glyph. Monoline, currentColor. */
export function ScooterIcon({ className }: IconProps) {
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
      {/* Wheels */}
      <circle cx="6" cy="17.5" r="2.5" />
      <circle cx="18" cy="17.5" r="2.5" />
      {/* Deck + frame */}
      <path d="M8.5 17.5h7" />
      <path d="M6 17.5l1.8-7.5h3.7l3 5.5" />
      {/* Handlebar / steering column */}
      <path d="M11.5 10l1-3.5h2.2" />
      <path d="M13.8 6.5h2" />
      {/* Delivery box */}
      <path d="M15.5 15.5l1-4.5h3.2l1 4.5" />
    </svg>
  );
}
