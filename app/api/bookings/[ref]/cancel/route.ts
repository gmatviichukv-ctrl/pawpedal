import { parseCancelRequest } from "@/lib/parse";
import { normalizeRef } from "@/lib/ref";
import { todayIn } from "@/lib/rules";
import type { Booking } from "@/lib/types";
import { SHOP_TIME_ZONE } from "@/server/catalog";
import { transact } from "@/server/store";

type Outcome = { booking: Booking } | { status: 404 | 409; code: string; message: string };

const NOT_FOUND = { status: 404, code: "NOT_FOUND", message: "Booking not found." } as const;

export async function POST(request: Request, ctx: { params: Promise<{ ref: string }> }) {
  const body = parseCancelRequest(await request.json().catch(() => null));
  if (!body) return Response.json({ errors: [{ code: "INVALID_REQUEST", message: "Request body must contain an email." }] }, { status: 400 });

  const ref = normalizeRef((await ctx.params).ref);
  const now = new Date();
  const today = todayIn(SHOP_TIME_ZONE, now);

  const outcome = await transact<Outcome>((bookings) => {
    const found = bookings.find((b) => b.ref === ref);
    // Unknown ref and wrong email look identical (R5.4).
    if (!found || found.customerEmail.toLowerCase() !== body.email.trim().toLowerCase()) return { result: NOT_FOUND };
    if (found.status === "cancelled") return { result: { status: 409, code: "ALREADY_CANCELLED", message: "This booking is already cancelled." } };
    if (today > found.to) return { result: { status: 409, code: "RENTAL_ENDED", message: "This rental has already ended." } };
    const booking: Booking = { ...found, status: "cancelled", cancelledAt: now.toISOString() };
    return { bookings: bookings.map((b) => (b.ref === ref ? booking : b)), result: { booking } };
  });

  if ("booking" in outcome) return Response.json({ booking: outcome.booking });
  return Response.json({ errors: [{ code: outcome.code, message: outcome.message }] }, { status: outcome.status });
}
