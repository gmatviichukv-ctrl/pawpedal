import { inclusiveDays, parseDate } from "./dates";
import type { Bike, Gear, Quote } from "./types";

const DISCOUNT_FROM_DAYS = 7;

/** Calendar days from `from` to `to`, both inclusive (R2.1). Dates must already be valid. */
export function countDays(from: string, to: string): number {
  const a = parseDate(from);
  const b = parseDate(to);
  if (a === null || b === null) throw new Error(`Invalid date range ${from}..${to}`);
  return inclusiveDays(a, b);
}

export function quote(input: { bike: Bike; gear: Gear[]; from: string; to: string }): Quote {
  const days = countDays(input.from, input.to);
  const perDay = input.gear.reduce((sum, g) => sum + g.pricePerDay, input.bike.pricePerDay);
  const subtotalCents = perDay * days;
  // 10 % rounded to the nearest cent, half a cent in the customer's favour (R2.3).
  const discountCents = days >= DISCOUNT_FROM_DAYS ? Math.floor((subtotalCents + 5) / 10) : 0;
  return { days, subtotalCents, discountCents, totalCents: subtotalCents - discountCents };
}
