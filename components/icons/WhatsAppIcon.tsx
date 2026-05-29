interface IconProps {
  className?: string;
}

/** WhatsApp glyph: chat bubble + handset. Monoline, currentColor. */
export function WhatsAppIcon({ className }: IconProps) {
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
      <path d="M3 21l1.65-4.5A8.5 8.5 0 1 1 7.5 19.35L3 21z" />
      <path d="M8.6 8.4c-.2 0-.45.05-.65.3-.2.25-.75.75-.75 1.8s.78 2.1.88 2.25c.1.15 1.5 2.45 3.75 3.35 1.85.75 2.25.6 2.65.55.4-.05 1.3-.5 1.5-1 .2-.5.2-.95.15-1.05-.05-.1-.2-.15-.4-.25-.2-.1-1.3-.65-1.5-.72-.2-.07-.35-.1-.5.1-.15.2-.55.72-.68.87-.12.15-.25.17-.45.07-.2-.1-.9-.33-1.7-1.05-.63-.56-1.05-1.25-1.18-1.45-.12-.2-.01-.32.09-.42.09-.09.2-.24.3-.36.1-.12.13-.2.2-.34.07-.15.03-.27-.02-.37-.05-.1-.45-1.18-.63-1.6-.16-.4-.32-.35-.45-.36h-.4z" />
    </svg>
  );
}
