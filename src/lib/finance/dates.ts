/** yyyy-mm-dd for a Date, in local time. */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
//  Reference clock
//
//  Real accounts read the real system clock. The demo dataset is generated
//  "as of" the last day of the previous month so every screen shows a full,
//  complete month; the store then points this clock at that date so all the
//  "this month" / "elapsed days" logic stays consistent with the data.
// ---------------------------------------------------------------------------
let referenceDate: Date | null = null;

export function setReferenceDate(iso: string | null | undefined): void {
  referenceDate = iso ? new Date(`${iso}T12:00:00`) : null;
}

/** Current moment — the reference date when one is set, otherwise the real clock. */
export function now(): Date {
  return referenceDate ? new Date(referenceDate) : new Date();
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // yyyy-mm
}

export function monthLabel(key: string, opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" }): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-CA", opts);
}

export function currentMonthKey(): string {
  return isoDate(now()).slice(0, 7);
}

/** yyyy-mm-dd for the reference clock. */
export function todayIso(): string {
  return isoDate(now());
}

export function addMonths(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return isoDate(d).slice(0, 7);
}

export function monthRange(key: string): { start: string; end: string } {
  const [y, m] = key.split("-").map(Number);
  return { start: `${key}-01`, end: isoDate(new Date(y, m, 0)) };
}

/** list of month keys from oldest..newest inclusive, length `count`, ending at `end` (default current). */
export function lastMonths(count: number, end = currentMonthKey()): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(end, -(count - 1 - i)));
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", opts);
}

export function relativeDay(iso: string): string {
  const today = isoDate(now());
  if (iso === today) return "Today";
  const y = now();
  y.setDate(y.getDate() - 1);
  if (iso === isoDate(y)) return "Yesterday";
  return formatDate(iso, { month: "short", day: "numeric" });
}
