interface IconProps {
  className?: string;
}

/** Delivery scooter glyph matched to the Polar prototype. */
export function ScooterIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 46 41"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <image href="/images/icons/polar-scooter.png" width="46" height="41" />
    </svg>
  );
}
