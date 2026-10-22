// @vitest-environment node
// Route handlers are called directly (spec Q3) with a fresh temporary bookings file per test.
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { GET as getCatalog } from "./catalog/route";
import { POST as postQuote } from "./quote/route";
import { POST as postBooking } from "./bookings/route";
import { GET as getBooking } from "./bookings/[ref]/route";
import { POST as postCancel } from "./bookings/[ref]/cancel/route";

const json = (body: unknown) =>
  new Request("http://test/api", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });
const ctx = (ref: string) => ({ params: Promise.resolve({ ref }) });

// "Now" = 1 Nov 2026, 10:00 in Madrid. Only Date is faked so fs promises keep working.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-01T09:00:00Z"));
  process.env.BOOKINGS_FILE = join(mkdtempSync(join(tmpdir(), "pawpedal-")), "bookings.json");
});
afterEach(() => vi.useRealTimers());

const valid = {
  bikeId: "cargo-long", gearIds: ["trailer-xl"], from: "2026-11-02", to: "2026-11-04", dogWeightKg: 25,
  customerName: "Halyna", customerEmail: "halyna@example.com",
};
const book = async (over: Record<string, unknown> = {}) => postBooking(json({ ...valid, ...over }));
const errorCodes = async (res: Response) => ((await res.json()).errors as { code: string }[]).map((e) => e.code);

describe("R1 catalog", () => {
  test("R1.1: GET /api/catalog returns bikes and gear", async () => {
    const body = await (await getCatalog()).json();
    expect(body.bikes).toHaveLength(4);
    expect(body.gear).toHaveLength(4);
  });
});

describe("R5.1 quote", () => {
  test("R5.1: returns the price and no errors for a valid request", async () => {
    const res = await postQuote(json(valid));
    expect(res.status).toBe(200);
    // (3800 + 900) × 3
    expect(await res.json()).toEqual({ quote: { days: 3, subtotalCents: 14100, discountCents: 0, totalCents: 14100 }, errors: [] });
  });

  test("R5.1: returns errors (and no quote) when the request breaks a rule", async () => {
    const body = await (await postQuote(json({ ...valid, bikeId: "city-classic" }))).json();
    expect(body.errors.map((e: { code: string }) => e.code)).toEqual(["NEEDS_TRAILER_HITCH"]);
    expect(body.quote).toBeNull();
  });

  test("R5.1: a half-filled form (no name yet) still gets a price", async () => {
    const body = await (await postQuote(json({ ...valid, customerName: "", customerEmail: "" }))).json();
    expect(body.quote.totalCents).toBe(14100);
  });
});

describe("R5.2 create booking", () => {
  test("R5.2: valid booking → 201, stored, active, with ref and total", async () => {
    const res = await book();
    expect(res.status).toBe(201);
    const { booking } = await res.json();
    expect(booking).toMatchObject({ ...valid, status: "active", totalCents: 14100 });
    expect(booking.ref).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(JSON.parse(readFileSync(process.env.BOOKINGS_FILE!, "utf8"))).toHaveLength(1);
  });

  test("R5.2: rule violations → 400 with all codes", async () => {
    const res = await book({ customerEmail: "nope", from: "2026-10-31" });
    expect(res.status).toBe(400);
    expect((await errorCodes(res)).sort()).toEqual(["INVALID_EMAIL", "START_IN_PAST"]);
  });

  test("R5.2: not available → 409", async () => {
    expect((await book()).status).toBe(201);
    const res = await book({ bikeId: "e-cruiser" }); // other bike, same last trailer
    expect(res.status).toBe(409);
    expect(await errorCodes(res)).toEqual(["GEAR_UNAVAILABLE"]);
  });

  test("R5.2: malformed JSON or wrong shape → 400, never 500", async () => {
    expect((await postBooking(json("{oops"))).status).toBe(400);
    expect((await postBooking(json({ bikeId: 7 }))).status).toBe(400);
    expect((await postBooking(json({ ...valid, gearIds: "trailer-xl" }))).status).toBe(400);
    expect((await postBooking(json(null))).status).toBe(400);
  });

  test("R4.5: two simultaneous requests for the last trailer → exactly one booking", async () => {
    const statuses = (await Promise.all([book(), book({ bikeId: "e-cruiser" })])).map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409]);
    expect(JSON.parse(readFileSync(process.env.BOOKINGS_FILE!, "utf8"))).toHaveLength(1);
  });
});

describe("R5.3 / R5.4 look up and cancel", () => {
  test("R5.3: GET by ref + email, ref and email case-insensitive", async () => {
    const { booking } = await (await book()).json();
    const res = await getBooking(new Request("http://test?email=HALYNA%40example.com"), ctx(booking.ref.toLowerCase()));
    expect(res.status).toBe(200);
    expect((await res.json()).booking.ref).toBe(booking.ref);
  });

  test("R5.3 (v1.2): missing email, wrong email and unknown ref all give the same 404", async () => {
    const { booking } = await (await book()).json();
    const noEmail = await getBooking(new Request("http://test"), ctx(booking.ref));
    const wrongEmail = await getBooking(new Request("http://test?email=x%40y.z"), ctx(booking.ref));
    const unknown = await getBooking(new Request("http://test?email=halyna%40example.com"), ctx("ZZZZZZZZ"));
    expect([noEmail.status, wrongEmail.status, unknown.status]).toEqual([404, 404, 404]);
    const bodies = await Promise.all([noEmail.json(), wrongEmail.json(), unknown.json()]);
    expect(bodies[0]).toEqual(bodies[2]);
    expect(bodies[1]).toEqual(bodies[2]);
  });

  test("R5.4: cancel with the right email → cancelled, and the trailer is free again (R4.4)", async () => {
    const { booking } = await (await book()).json();
    const res = await postCancel(json({ email: "HALYNA@example.com" }), ctx(booking.ref));
    expect(res.status).toBe(200);
    expect((await res.json()).booking).toMatchObject({ ref: booking.ref, status: "cancelled" });
    expect((await book({ bikeId: "e-cruiser" })).status).toBe(201);
  });

  test("R5.4: wrong email and unknown ref give the same 404 (no ref enumeration)", async () => {
    const { booking } = await (await book()).json();
    const wrongEmail = await postCancel(json({ email: "someone@else.com" }), ctx(booking.ref));
    const unknownRef = await postCancel(json({ email: "halyna@example.com" }), ctx("ZZZZZZZZ"));
    expect(wrongEmail.status).toBe(404);
    expect(unknownRef.status).toBe(404);
    expect(await wrongEmail.json()).toEqual(await unknownRef.json());
  });

  test("R5.4: cancelling twice → 409", async () => {
    const { booking } = await (await book()).json();
    expect((await postCancel(json({ email: valid.customerEmail }), ctx(booking.ref))).status).toBe(200);
    expect((await postCancel(json({ email: valid.customerEmail }), ctx(booking.ref))).status).toBe(409);
  });

  test("R5.4: cancelling during the rental is allowed; after it ended → 409", async () => {
    const { booking } = await (await book()).json(); // 2–4 Nov
    vi.setSystemTime(new Date("2026-11-03T09:00:00Z")); // mid-rental
    expect((await postCancel(json({ email: valid.customerEmail }), ctx(booking.ref))).status).toBe(200);

    vi.setSystemTime(new Date("2026-11-01T09:00:00Z"));
    const second = await (await book({ from: "2026-11-05", to: "2026-11-06" })).json();
    vi.setSystemTime(new Date("2026-11-07T09:00:00Z")); // after it ended
    expect((await postCancel(json({ email: valid.customerEmail }), ctx(second.booking.ref))).status).toBe(409);
  });
});
