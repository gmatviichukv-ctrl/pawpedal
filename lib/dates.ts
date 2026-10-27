const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** Strictly parses YYYY-MM-DD to UTC midnight milliseconds; null for malformed or impossible dates. */
export function parseDate(s: string): number | null {
  const m = DATE_RE.exec(s);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return ms;
}

/** Calendar days from `from` to `to`, both inclusive. Both must be valid dates. */
export function inclusiveDays(from: number, to: number): number {
  return Math.round((to - from) / MS_PER_DAY) + 1;
}
