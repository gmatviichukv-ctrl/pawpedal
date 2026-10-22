import { describe, expect, test } from "vitest";
import { todayIn, validateBooking } from "./rules";
import type { BookingRequest, Catalog } from "./types";

const catalog: Catalog = {
  bikes: [
    { id: "city", name: "City bike", type: "city", pricePerDay: 1200, hasTrailerHitch: false, hasFrontRack: false },
    { id: "cargo", name: "Cargo bike", type: "cargo", pricePerDay: 3500, hasTrailerHitch: true, hasFrontRack: true },
  ],
  gear: [
    { id: "trailer", name: "Dog trailer", kind: "trailer", pricePerDay: 900, stock: 1, maxDogWeightKg: 40 },
    { id: "basket", name: "Front basket", kind: "basket", pricePerDay: 400, stock: 2, maxDogWeightKg: 8 },
    { id: "leash", name: "Leash mount", kind: "leash-mount", pricePerDay: 200, stock: 5 },
  ],
};
const today = "2026-11-01";
const ok: BookingRequest = {
  bikeId: "cargo", gearIds: ["trailer"], from: "2026-11-02", to: "2026-11-04", dogWeightKg: 25,
  customerName: "Halyna", customerEmail: "halyna@example.com",
};
const codes = (r: Partial<BookingRequest>) => validateBooking({ ...ok, ...r }, catalog, today).map((e) => e.code);

describe("R3 booking rules", () => {
  test("R3: a valid request has no errors", () => {
    expect(validateBooking(ok, catalog, today)).toEqual([]);
  });

  test("R3.1: malformed or impossible dates are rejected", () => {
    expect(codes({ from: "tomorrow" })).toEqual(["INVALID_DATE"]);
    expect(codes({ to: "2026-02-30" })).toEqual(["INVALID_DATE"]);
    expect(codes({ from: "2026-11-5" })).toEqual(["INVALID_DATE"]);
  });

  test("R3.1: end before start is rejected", () => {
    expect(codes({ from: "2026-11-05", to: "2026-11-04" })).toEqual(["END_BEFORE_START"]);
  });

  test("R3.2: today is allowed, yesterday is not", () => {
    expect(codes({ from: "2026-11-01" })).toEqual([]);
    expect(codes({ from: "2026-10-31" })).toEqual(["START_IN_PAST"]);
  });

  test("R3.2: 'today' is computed in the shop time zone (Europe/Madrid)", () => {
    // 23:30 UTC on 31 Oct is already 1 Nov 00:30 in Madrid (CET, UTC+1)
    expect(todayIn("Europe/Madrid", new Date("2026-10-31T23:30:00Z"))).toBe("2026-11-01");
    expect(todayIn("Europe/Madrid", new Date("2026-10-31T22:30:00Z"))).toBe("2026-10-31");
  });

  test("R3.3: 30 days is the maximum", () => {
    expect(codes({ from: "2026-11-02", to: "2026-12-01" })).toEqual([]);
    expect(codes({ from: "2026-11-02", to: "2026-12-02" })).toEqual(["TOO_LONG"]);
  });

  test("R3.4: a trailer needs a hitch, a basket needs a front rack", () => {
    expect(codes({ bikeId: "city", gearIds: ["trailer"] })).toEqual(["NEEDS_TRAILER_HITCH"]);
    expect(codes({ bikeId: "city", gearIds: ["basket"], dogWeightKg: 5 })).toEqual(["NEEDS_FRONT_RACK"]);
    expect(codes({ bikeId: "city", gearIds: ["leash"] })).toEqual([]);
  });

  test("R3.5: gear with a weight limit refuses a heavier dog", () => {
    expect(codes({ gearIds: ["basket"], dogWeightKg: 8 })).toEqual([]);
    expect(codes({ gearIds: ["basket"], dogWeightKg: 9 })).toEqual(["DOG_TOO_HEAVY"]);
  });

  test("R3.6: bike-only rental is allowed and needs no dog weight", () => {
    expect(codes({ gearIds: [], dogWeightKg: undefined })).toEqual([]);
  });

  test("R3.6: with gear, dog weight is required and must be 1–90 kg", () => {
    expect(codes({ dogWeightKg: undefined })).toEqual(["DOG_WEIGHT_REQUIRED"]);
    expect(codes({ dogWeightKg: 0 })).toEqual(["DOG_WEIGHT_REQUIRED"]);
    expect(codes({ gearIds: ["leash"], dogWeightKg: 91 })).toEqual(["DOG_WEIGHT_REQUIRED"]);
  });

  test("R3.7: the same gear twice is rejected", () => {
    expect(codes({ gearIds: ["leash", "leash"] })).toEqual(["DUPLICATE_GEAR"]);
  });

  test("R3.8: name 2–80 chars, email with text around one @", () => {
    expect(codes({ customerName: "H" })).toEqual(["INVALID_NAME"]);
    expect(codes({ customerName: "  " })).toEqual(["INVALID_NAME"]);
    expect(codes({ customerName: "x".repeat(81) })).toEqual(["INVALID_NAME"]);
    expect(codes({ customerEmail: "halyna.example.com" })).toEqual(["INVALID_EMAIL"]);
    expect(codes({ customerEmail: "a@@b" })).toEqual(["INVALID_EMAIL"]);
    expect(codes({ customerEmail: "@b.com" })).toEqual(["INVALID_EMAIL"]);
  });

  test("R3.9: all errors are returned together, each with an English message", () => {
    const errors = validateBooking(
      { ...ok, bikeId: "city", gearIds: ["trailer", "nope"], customerEmail: "bad", from: "2026-10-30" },
      catalog,
      today,
    );
    expect(errors.map((e) => e.code).sort()).toEqual(["INVALID_EMAIL", "NEEDS_TRAILER_HITCH", "START_IN_PAST", "UNKNOWN_GEAR"]);
    for (const e of errors) expect(e.message).toMatch(/^[A-Z][^А-яЁё]+$/);
  });

  test("R3.9: unknown bike is reported, not thrown", () => {
    expect(codes({ bikeId: "nope" })).toEqual(["UNKNOWN_BIKE"]);
  });
});
