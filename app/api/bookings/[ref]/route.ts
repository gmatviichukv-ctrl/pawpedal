import { normalizeRef } from "@/lib/ref";
import { findBooking } from "@/server/store";

const NOT_FOUND = { errors: [{ code: "NOT_FOUND", message: "Booking not found." }] };

/** R5.3 (v1.2): the email must match, and every miss looks the same — no ref enumeration. */
export async function GET(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase();
  const booking = email ? await findBooking(normalizeRef(ref)) : undefined;
  if (!booking || booking.customerEmail.toLowerCase() !== email) return Response.json(NOT_FOUND, { status: 404 });
  return Response.json({ booking });
}
