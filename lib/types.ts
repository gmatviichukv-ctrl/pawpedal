// Domain contract from docs/spec.md §5. Implementations: pricing.ts, rules.ts, availability.ts, ref.ts.

export type BikeType = "city" | "trekking" | "e-bike" | "cargo";
export type GearKind = "trailer" | "basket" | "leash-mount" | "vest";

export interface Bike {
  id: string;
  name: string;
  type: BikeType;
  pricePerDay: number; // cents
  hasTrailerHitch: boolean;
  hasFrontRack: boolean;
  photo?: string;
}

export interface Gear {
  id: string;
  name: string;
  kind: GearKind;
  pricePerDay: number; // cents
  stock: number;
  maxDogWeightKg?: number;
}

export interface Catalog {
  bikes: Bike[];
  gear: Gear[];
}

export interface BookingRequest {
  bikeId: string;
  gearIds: string[];
  from: string; // YYYY-MM-DD, inclusive
  to: string; // YYYY-MM-DD, inclusive
  dogWeightKg?: number;
  customerName: string;
  customerEmail: string;
}

export type BookingStatus = "active" | "cancelled";

export interface Booking extends BookingRequest {
  ref: string;
  status: BookingStatus;
  totalCents: number;
  createdAt: string; // ISO timestamp
  cancelledAt?: string;
}

export interface Quote {
  days: number;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}

export type ErrorCode =
  | "INVALID_DATE"
  | "END_BEFORE_START"
  | "START_IN_PAST"
  | "TOO_LONG"
  | "UNKNOWN_BIKE"
  | "UNKNOWN_GEAR"
  | "DUPLICATE_GEAR"
  | "NEEDS_TRAILER_HITCH"
  | "NEEDS_FRONT_RACK"
  | "DOG_WEIGHT_REQUIRED"
  | "DOG_TOO_HEAVY"
  | "INVALID_NAME"
  | "INVALID_EMAIL"
  | "BIKE_UNAVAILABLE"
  | "GEAR_UNAVAILABLE";

export interface DomainError {
  code: ErrorCode;
  message: string; // English, shown to the customer
  field?: keyof BookingRequest;
}
