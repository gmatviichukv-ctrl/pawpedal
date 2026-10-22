import { parseBookingRequest } from "@/lib/parse";
import { quote } from "@/lib/pricing";
import { todayIn, validateBooking } from "@/lib/rules";
import { catalog, SHOP_TIME_ZONE } from "@/server/catalog";

const CUSTOMER_CODES = ["INVALID_NAME", "INVALID_EMAIL"];

export async function POST(request: Request) {
  const req = parseBookingRequest(await request.json().catch(() => null));
  if (!req) return Response.json({ quote: null, errors: [{ code: "INVALID_REQUEST", message: "Request body has the wrong shape." }] }, { status: 400 });

  const errors = validateBooking(req, catalog, todayIn(SHOP_TIME_ZONE, new Date()));
  // A half-filled form (no name/email yet) still gets a price; any other problem does not.
  if (errors.some((e) => !CUSTOMER_CODES.includes(e.code))) return Response.json({ quote: null, errors });

  const bike = catalog.bikes.find((b) => b.id === req.bikeId)!;
  const gear = catalog.gear.filter((g) => req.gearIds.includes(g.id));
  return Response.json({ quote: quote({ bike, gear, from: req.from, to: req.to }), errors });
}
