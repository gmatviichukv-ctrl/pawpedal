import { describe, expect, test } from "vitest";
import { countDays, quote } from "./pricing";
import type { Bike, Gear } from "./types";

const bike = (pricePerDay: number): Bike => ({
  id: "b", name: "Bike", type: "city", pricePerDay, hasTrailerHitch: true, hasFrontRack: true,
});
const gear = (pricePerDay: number): Gear => ({ id: `g${pricePerDay}`, name: "Gear", kind: "vest", pricePerDay, stock: 1 });

describe("R2 price quote", () => {
  test("R2.1: both dates are inclusive, across months and DST", () => {
    expect(countDays("2026-11-02", "2026-11-04")).toBe(3);
    expect(countDays("2026-11-02", "2026-11-02")).toBe(1);
    expect(countDays("2026-10-31", "2026-11-01")).toBe(2);
    expect(countDays("2027-03-27", "2027-03-29")).toBe(3); // EU clocks change on 2027-03-28
    expect(countDays("2028-02-28", "2028-03-01")).toBe(3); // leap year
  });

  test("R2.2: (bike + gear) per day × days, in integer cents", () => {
    expect(quote({ bike: bike(1850), gear: [gear(800), gear(150)], from: "2026-11-02", to: "2026-11-04" })).toEqual({
      days: 3, subtotalCents: 8400, discountCents: 0, totalCents: 8400,
    });
  });

  test("R2.2: bike-only rental (no gear) is priced on the bike alone", () => {
    expect(quote({ bike: bike(1200), gear: [], from: "2026-11-02", to: "2026-11-03" }).totalCents).toBe(2400);
  });

  test("R2.3: 6 days — no discount; 7 days — 10 % off", () => {
    expect(quote({ bike: bike(1000), gear: [], from: "2026-11-02", to: "2026-11-07" })).toMatchObject({ days: 6, discountCents: 0, totalCents: 6000 });
    expect(quote({ bike: bike(1000), gear: [], from: "2026-11-02", to: "2026-11-08" })).toEqual({
      days: 7, subtotalCents: 7000, discountCents: 700, totalCents: 6300,
    });
  });

  test("R2.3: discount half-cent rounds in the customer's favour", () => {
    // 465 × 7 = 3255 → 10 % = 325.5 → discount 326 → total 2929
    expect(quote({ bike: bike(465), gear: [], from: "2026-11-02", to: "2026-11-08" })).toEqual({
      days: 7, subtotalCents: 3255, discountCents: 326, totalCents: 2929,
    });
  });
});
