/** yyyy-mm-dd for a Date, in local time. */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // yyyy-mm
}

export function monthLabel(key: string, opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" }): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-CA", opts);
}

export function currentMonthKey(): string {
  return isoDate(new Date()).slice(0, 7);
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
  const today = isoDate(new Date());
  if (iso === today) return "Today";
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (iso === isoDate(y)) return "Yesterday";
  return formatDate(iso, { month: "short", day: "numeric" });
}
