import type { Booking, DomainError, Gear } from "./types";

interface Range {
  from: string;
  to: string;
}

/** Inclusive on both ends (R4.1). */
export function overlaps(a: Range, b: Range): boolean {
  return a.from <= b.to && b.from <= a.to;
}

export function checkAvailability(
  req: Range & { bikeId: string; gearIds: string[] },
  bookings: Booking[],
  gear: Gear[],
): DomainError[] {
  const errors: DomainError[] = [];
  const blocking = bookings.filter((b) => b.status === "active" && overlaps(req, b));

  if (blocking.some((b) => b.bikeId === req.bikeId)) {
    errors.push({ code: "BIKE_UNAVAILABLE", message: "This bike is already booked for the selected dates.", field: "bikeId" });
  }

  for (const id of req.gearIds) {
    const item = gear.find((g) => g.id === id);
    if (!item) continue;
    const taken = blocking.filter((b) => b.gearIds.includes(id)).length;
    if (taken >= item.stock) {
      errors.push({ code: "GEAR_UNAVAILABLE", message: `${item.name} is not available for the selected dates.`, field: "gearIds" });
    }
  }
  return errors;
}
