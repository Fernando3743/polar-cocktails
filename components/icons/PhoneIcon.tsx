interface IconProps {
  className?: string;
}

/** Telephone handset glyph matched to the Polar prototype. */
export function PhoneIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 37 43"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <image href="/images/icons/polar-phone.png" width="37" height="43" />
    </svg>
  );
}
