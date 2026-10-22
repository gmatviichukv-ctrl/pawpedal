import { describe, expect, test } from "vitest";
import { checkAvailability, overlaps } from "./availability";
import type { Booking, Gear } from "./types";

const gear: Gear[] = [
  { id: "trailer", name: "Dog trailer", kind: "trailer", pricePerDay: 900, stock: 1 },
  { id: "basket", name: "Front basket", kind: "basket", pricePerDay: 400, stock: 2 },
];
const booking = (over: Partial<Booking>): Booking => ({
  ref: "ABCDEFGH", bikeId: "cargo", gearIds: [], from: "2026-11-10", to: "2026-11-12",
  customerName: "A", customerEmail: "a@b.c", status: "active", totalCents: 0, createdAt: "2026-10-22T00:00:00Z",
  ...over,
});
const req = (over: Partial<{ bikeId: string; gearIds: string[]; from: string; to: string }>) => ({
  bikeId: "cargo", gearIds: [] as string[], from: "2026-11-10", to: "2026-11-12", ...over,
});
const codes = (r: ReturnType<typeof req>, bookings: Booking[]) => checkAvailability(r, bookings, gear).map((e) => e.code);

describe("R4 availability", () => {
  test("R4.1: ranges overlap when they share a day, inclusive on both ends", () => {
    const a = { from: "2026-11-10", to: "2026-11-12" };
    expect(overlaps(a, { from: "2026-11-12", to: "2026-11-14" })).toBe(true);
    expect(overlaps(a, { from: "2026-11-13", to: "2026-11-14" })).toBe(false);
    expect(overlaps(a, { from: "2026-11-08", to: "2026-11-09" })).toBe(false);
    expect(overlaps(a, { from: "2026-11-01", to: "2026-11-30" })).toBe(true);
  });

  test("R4.2: a bike with an active overlapping booking is unavailable", () => {
    const existing = [booking({})];
    expect(codes(req({ from: "2026-11-12", to: "2026-11-13" }), existing)).toEqual(["BIKE_UNAVAILABLE"]);
    expect(codes(req({ from: "2026-11-13", to: "2026-11-13" }), existing)).toEqual([]);
    expect(codes(req({ bikeId: "city" }), existing)).toEqual([]);
  });

  test("R4.3: gear is unavailable once overlapping active bookings reach stock", () => {
    const one = [booking({ bikeId: "x", gearIds: ["basket"] })];
    const two = [...one, booking({ ref: "B2", bikeId: "y", gearIds: ["basket"] })];
    const r = req({ bikeId: "city", gearIds: ["basket"], from: "2026-11-11", to: "2026-11-11" });
    expect(codes(r, one)).toEqual([]);
    expect(codes(r, two)).toEqual(["GEAR_UNAVAILABLE"]);
  });

  test("R4.3: reports the bike and each unavailable gear item", () => {
    const existing = [booking({ gearIds: ["trailer"] })];
    expect(codes(req({ gearIds: ["trailer", "basket"] }), existing)).toEqual(["BIKE_UNAVAILABLE", "GEAR_UNAVAILABLE"]);
  });

  test("R4.4: cancelled bookings block nothing", () => {
    const existing = [booking({ gearIds: ["trailer"], status: "cancelled" })];
    expect(codes(req({ gearIds: ["trailer"] }), existing)).toEqual([]);
  });
});
