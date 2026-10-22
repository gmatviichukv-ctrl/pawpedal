import { checkAvailability } from "@/lib/availability";
import { parseBookingRequest } from "@/lib/parse";
import { quote } from "@/lib/pricing";
import { todayIn, validateBooking } from "@/lib/rules";
import type { Booking, DomainError } from "@/lib/types";
import { catalog, SHOP_TIME_ZONE } from "@/server/catalog";
import { newRef, transact } from "@/server/store";

export async function POST(request: Request) {
  const req = parseBookingRequest(await request.json().catch(() => null));
  if (!req) return Response.json({ errors: [{ code: "INVALID_REQUEST", message: "Request body has the wrong shape." }] }, { status: 400 });

  const now = new Date();
  const errors = validateBooking(req, catalog, todayIn(SHOP_TIME_ZONE, now));
  if (errors.length > 0) return Response.json({ errors }, { status: 400 });

  const bike = catalog.bikes.find((b) => b.id === req.bikeId)!;
  const gear = catalog.gear.filter((g) => req.gearIds.includes(g.id));
  const { totalCents } = quote({ bike, gear, from: req.from, to: req.to });

  const outcome = await transact<{ booking: Booking } | { errors: DomainError[] }>((bookings) => {
    const unavailable = checkAvailability(req, bookings, catalog.gear);
    if (unavailable.length > 0) return { result: { errors: unavailable } };
    let ref = newRef();
    while (bookings.some((b) => b.ref === ref)) ref = newRef();
    const booking: Booking = { ...req, ref, status: "active", totalCents, createdAt: now.toISOString() };
    return { bookings: [...bookings, booking], result: { booking } };
  });

  if ("errors" in outcome) return Response.json({ errors: outcome.errors }, { status: 409 });
  return Response.json({ booking: outcome.booking }, { status: 201 });
}
