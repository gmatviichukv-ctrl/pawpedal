import { expect, test } from "vitest";
import { formatEur, gearFit } from "./display";
import type { Bike, Gear } from "./types";

const bike = (hasTrailerHitch: boolean, hasFrontRack: boolean): Bike => ({
  id: "b", name: "B", type: "city", pricePerDay: 1000, hasTrailerHitch, hasFrontRack,
});
const g = (kind: Gear["kind"]): Gear => ({ id: kind, name: kind, kind, pricePerDay: 100, stock: 1 });

test("R6.1: gear that cannot fit the bike gets a reason; gear that fits gets null", () => {
  expect(gearFit(bike(false, false), g("trailer"))).toBe("Needs a bike with a trailer hitch");
  expect(gearFit(bike(false, false), g("basket"))).toBe("Needs a bike with a front rack");
  expect(gearFit(bike(true, true), g("trailer"))).toBeNull();
  expect(gearFit(bike(false, false), g("leash-mount"))).toBeNull();
  expect(gearFit(bike(false, false), g("vest"))).toBeNull();
});

test("R1.2: cents are shown as euros", () => {
  expect(formatEur(1200)).toBe("€12.00");
  expect(formatEur(2929)).toBe("€29.29");
  expect(formatEur(100050)).toBe("€1,000.50");
});
