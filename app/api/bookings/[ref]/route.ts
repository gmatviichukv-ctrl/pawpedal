import { normalizeRef } from "@/lib/ref";
import { findBooking } from "@/server/store";

export async function GET(_req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  const booking = await findBooking(normalizeRef(ref));
  if (!booking) return Response.json({ errors: [{ code: "NOT_FOUND", message: "Booking not found." }] }, { status: 404 });
  return Response.json({ booking });
}
