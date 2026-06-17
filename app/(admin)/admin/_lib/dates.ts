/**
 * Format an ISO timestamp with the given Intl formatter, returning the raw
 * string on an unparseable input. The admin order/dashboard pages each supply
 * their own module-scope formatter (the display granularity differs per screen)
 * and share this guard + parse so the logic lives in one place.
 */
export function formatDate(iso: string, format: Intl.DateTimeFormat): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return format.format(date);
}
