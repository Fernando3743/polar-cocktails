interface IconProps {
  className?: string;
}

/** Location pin glyph matched to the Polar prototype. */
export function MapPinIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 34 43"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <image href="/images/icons/polar-pin.png" width="34" height="43" />
    </svg>
  );
}
