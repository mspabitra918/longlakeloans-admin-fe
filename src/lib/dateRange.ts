import { todayStr } from "./datetime";

/**
 * Date presets for list filters. Days are Pacific calendar days
 * (YYYY-MM-DD) — the backend converts them to Pacific day boundaries.
 */
export const DATE_PRESETS = [
  { key: "today", label: "Today", days: 1 },
  { key: "7d", label: "7D", days: 7 },
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
  { key: "1y", label: "1Y", days: 365 },
  { key: "all", label: "All time", days: 0 },
] as const;

export type DatePresetKey = (typeof DATE_PRESETS)[number]["key"] | "custom";

/** Shift a YYYY-MM-DD calendar day by n days (pure calendar math, no TZ). */
export function shiftDay(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** from/to for a preset; `all` returns empty strings (no date filter). */
export function presetRange(key: DatePresetKey): { from: string; to: string } {
  const preset = DATE_PRESETS.find((p) => p.key === key);
  if (!preset || preset.days === 0) return { from: "", to: "" };
  const today = todayStr();
  return { from: shiftDay(today, -(preset.days - 1)), to: today };
}

/** "Nov 4, 2026" for a YYYY-MM-DD calendar day. */
export function formatDay(day: string): string {
  if (!day) return "";
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Parse a backend bucket ("YYYY-MM-DDTHH:MM:SS", already Pacific wall time)
 * into a Date whose UTC fields hold that wall time — format it with
 * timeZone "UTC" to print the Pacific clock unchanged.
 */
export function bucketDate(bucket: string): Date {
  return new Date(`${bucket}Z`);
}
