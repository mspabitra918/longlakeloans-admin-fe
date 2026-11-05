/**
 * Date/time formatting for the admin portal.
 *
 * Every timestamp an underwriter sees is rendered in California time, so two
 * admin in different locations reading the same queue always see the same
 * clock. We use the IANA zone rather than a fixed -08:00 offset, so the
 * display follows daylight saving automatically (PST in winter, PDT in
 * summer); `formatDateTime` prints the abbreviation to make that explicit.
 */
export const ADMIN_TIME_ZONE = "America/Los_Angeles";

const EM_DASH = "—";

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Jul 20, 2026" — the Pacific calendar date of an instant. */
export function formatDate(iso: string | null | undefined): string {
  const d = parse(iso);
  return d
    ? d.toLocaleDateString("en-US", {
        timeZone: ADMIN_TIME_ZONE,
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : EM_DASH;
}

/** "Jul 20, 2026, 3:42 PM PDT" — the Pacific wall-clock time of an instant. */
export function formatDateTime(iso: string | null | undefined): string {
  const d = parse(iso);
  return d
    ? d.toLocaleString("en-US", {
        timeZone: ADMIN_TIME_ZONE,
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZoneName: "short",
      })
    : EM_DASH;
}

/**
 * "07/20/2026" for a calendar date that isn't an instant — a date of birth is
 * the same day everywhere, so it must NOT be shifted into Pacific. A bare
 * "1990-05-14" parses as UTC midnight, which any negative-offset zone would
 * render as the 13th; pinning the display to UTC keeps the stored day.
 */
export function formatCalendarDate(value: string | null | undefined): string {
  const d = parse(value);
  return d
    ? d.toLocaleDateString("en-US", {
        timeZone: "UTC",
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      })
    : "-";
}

/** Today's date in Pacific as YYYY-MM-DD, for date-range filter defaults. */
export function todayStr(): string {
  // en-CA formats as YYYY-MM-DD, which is what <input type="date"> expects.
  return new Date().toLocaleDateString("en-CA", { timeZone: ADMIN_TIME_ZONE });
}
