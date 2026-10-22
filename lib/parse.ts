import type { BookingRequest } from "./types";

const isString = (v: unknown): v is string => typeof v === "string";

/** Checks the JSON shape only; business rules live in validateBooking. Null when the shape is wrong. */
export function parseBookingRequest(input: unknown): BookingRequest | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const o = input as Record<string, unknown>;
  if (!isString(o.bikeId) || !isString(o.from) || !isString(o.to)) return null;
  if (!isString(o.customerName) || !isString(o.customerEmail)) return null;
  if (!Array.isArray(o.gearIds) || !o.gearIds.every(isString)) return null;
  if (o.dogWeightKg !== undefined && o.dogWeightKg !== null && (typeof o.dogWeightKg !== "number" || !Number.isFinite(o.dogWeightKg))) {
    return null;
  }
  const req: BookingRequest = {
    bikeId: o.bikeId,
    gearIds: o.gearIds,
    from: o.from,
    to: o.to,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
  };
  if (typeof o.dogWeightKg === "number") req.dogWeightKg = o.dogWeightKg;
  return req;
}

/** Cancel body: `{ email }`. Null when the shape is wrong. */
export function parseCancelRequest(input: unknown): { email: string } | null {
  if (typeof input !== "object" || input === null) return null;
  const email = (input as Record<string, unknown>).email;
  return isString(email) ? { email } : null;
}
