import type { Bike, Gear } from "./types";

/** Why `gear` cannot be used with `bike` (same rule as R3.4), or null when it fits. Used to disable checkboxes. */
export function gearFit(bike: Bike, gear: Gear): string | null {
  if (gear.kind === "trailer" && !bike.hasTrailerHitch) return "Needs a bike with a trailer hitch";
  if (gear.kind === "basket" && !bike.hasFrontRack) return "Needs a bike with a front rack";
  return null;
}

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

/** Integer cents → "€12.00". Display only — never use the result for arithmetic. */
export function formatEur(cents: number): string {
  return eur.format(cents / 100);
}
