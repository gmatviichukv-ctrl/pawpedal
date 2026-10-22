import { inclusiveDays, parseDate } from "./dates";
import type { BookingRequest, Catalog, DomainError } from "./types";

const MAX_DAYS = 30;
const MIN_DOG_KG = 1;
const MAX_DOG_KG = 90;

/** Today's date (YYYY-MM-DD) in the given IANA time zone. `now` is passed in, never read from the clock. */
export function todayIn(timeZone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function validEmail(email: string): boolean {
  const parts = email.split("@");
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
}

export function validateBooking(req: BookingRequest, catalog: Catalog, today: string): DomainError[] {
  const errors: DomainError[] = [];
  const add = (code: DomainError["code"], message: string, field?: DomainError["field"]) => errors.push({ code, message, field });

  // Dates (R3.1–R3.3)
  const from = parseDate(req.from);
  const to = parseDate(req.to);
  if (from === null) add("INVALID_DATE", "Start date must be a real date in YYYY-MM-DD format.", "from");
  if (to === null) add("INVALID_DATE", "End date must be a real date in YYYY-MM-DD format.", "to");
  if (from !== null && to !== null) {
    if (to < from) add("END_BEFORE_START", "End date cannot be before the start date.", "to");
    else if (inclusiveDays(from, to) > MAX_DAYS) add("TOO_LONG", `Rentals are limited to ${MAX_DAYS} days.`, "to");
  }
  if (from !== null && req.from < today) add("START_IN_PAST", "Start date cannot be in the past.", "from");

  // Bike and gear (R3.4, R3.5, R3.7)
  const bike = catalog.bikes.find((b) => b.id === req.bikeId);
  if (!bike) add("UNKNOWN_BIKE", "The selected bike does not exist.", "bikeId");

  if (new Set(req.gearIds).size !== req.gearIds.length) add("DUPLICATE_GEAR", "The same gear item cannot be booked twice.", "gearIds");

  // Dog weight is only required when gear is booked (R3.6).
  const dog = req.dogWeightKg;
  const dogOk = dog !== undefined && dog >= MIN_DOG_KG && dog <= MAX_DOG_KG;
  if (req.gearIds.length > 0 && !dogOk) {
    add("DOG_WEIGHT_REQUIRED", `Dog weight between ${MIN_DOG_KG} and ${MAX_DOG_KG} kg is required when booking gear.`, "dogWeightKg");
  }

  for (const id of new Set(req.gearIds)) {
    const item = catalog.gear.find((g) => g.id === id);
    if (!item) {
      add("UNKNOWN_GEAR", "A selected gear item does not exist.", "gearIds");
      continue;
    }
    if (bike && item.kind === "trailer" && !bike.hasTrailerHitch) {
      add("NEEDS_TRAILER_HITCH", `${item.name} needs a bike with a trailer hitch.`, "gearIds");
    }
    if (bike && item.kind === "basket" && !bike.hasFrontRack) {
      add("NEEDS_FRONT_RACK", `${item.name} needs a bike with a front rack.`, "gearIds");
    }
    if (dogOk && item.maxDogWeightKg !== undefined && dog > item.maxDogWeightKg) {
      add("DOG_TOO_HEAVY", `${item.name} is limited to dogs up to ${item.maxDogWeightKg} kg.`, "dogWeightKg");
    }
  }

  // Customer (R3.8)
  const nameLen = req.customerName.trim().length;
  if (nameLen < 2 || nameLen > 80) add("INVALID_NAME", "Name must be 2 to 80 characters.", "customerName");
  if (!validEmail(req.customerEmail)) add("INVALID_EMAIL", "Enter a valid email address.", "customerEmail");

  return errors;
}
