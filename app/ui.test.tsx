import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import catalog from "@/data/catalog.json";
import type { Bike, Gear } from "@/lib/types";
import { BookingForm } from "./book/[bikeId]/BookingForm";
import { MyBooking } from "./booking/MyBooking";

const bikes = catalog.bikes as Bike[];
const gear = catalog.gear as Gear[];
const byId = (id: string) => bikes.find((b) => b.id === id)!;

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("R6.1: gear that cannot fit the bike is disabled with the reason", () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ quote: null, errors: [] })));
  render(<BookingForm bike={byId("city-classic")} gear={gear} today="2026-11-01" />);
  const trailer = screen.getByRole("checkbox", { name: /Dog trailer/ }) as HTMLInputElement;
  expect(trailer.disabled).toBe(true);
  expect(screen.getByText("Needs a bike with a trailer hitch")).toBeDefined();
  expect((screen.getByRole("checkbox", { name: /Front basket/ }) as HTMLInputElement).disabled).toBe(false);
});

test("R6.1: dog weight appears only once gear is chosen; price comes from /api/quote", async () => {
  const fetchMock = vi.fn(async () => Response.json({ quote: { days: 3, subtotalCents: 14100, discountCents: 0, totalCents: 14100 }, errors: [] }));
  vi.stubGlobal("fetch", fetchMock);
  render(<BookingForm bike={byId("cargo-long")} gear={gear} today="2026-11-01" />);
  expect(screen.queryByLabelText("Dog weight (kg)")).toBeNull();
  fireEvent.click(screen.getByRole("checkbox", { name: /Dog trailer/ }));
  expect(screen.getByLabelText("Dog weight (kg)")).toBeDefined();
  await act(() => vi.advanceTimersByTimeAsync(300));
  const total = await screen.findByText("Total");
  expect(total.nextElementSibling?.textContent).toBe("€141.00");
  const lastBody = JSON.parse(String((fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit])[1].body));
  expect(lastBody).toMatchObject({ bikeId: "cargo-long", gearIds: ["trailer-xl"] });
});

test("R6.2: after booking, the full reference is shown", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) =>
    url === "/api/bookings"
      ? Response.json({ booking: { ref: "ABCD2345", bikeId: "cargo-long", gearIds: [], from: "2026-11-02", to: "2026-11-03", totalCents: 7600, status: "active" } }, { status: 201 })
      : Response.json({ quote: null, errors: [] }),
  ));
  render(<BookingForm bike={byId("cargo-long")} gear={gear} today="2026-11-01" />);
  fireEvent.click(screen.getByRole("button", { name: "Book" }));
  expect(await screen.findByText("ABCD2345")).toBeDefined();
  expect(screen.getByRole("button", { name: "Copy" })).toBeDefined();
});

test("R6.3: look up with ref + email, then cancel after confirming", async () => {
  const booking = { ref: "ABCD2345", bikeId: "cargo-long", gearIds: ["trailer-xl"], from: "2026-11-02", to: "2026-11-03", totalCents: 9400, status: "active" };
  const fetchMock = vi.fn(async (url: string) =>
    url.endsWith("/cancel")
      ? Response.json({ booking: { ...booking, status: "cancelled" } })
      : Response.json({ booking }),
  );
  vi.stubGlobal("fetch", fetchMock);
  render(<MyBooking />);
  fireEvent.change(screen.getByLabelText("Booking reference"), { target: { value: "abcd2345" } });
  fireEvent.change(screen.getByLabelText("Email used for the booking"), { target: { value: "h@x.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Find booking" }));
  expect(await screen.findByText("Active")).toBeDefined();
  expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/bookings/abcd2345?email=h%40x.com");

  fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));
  expect(fetchMock).toHaveBeenCalledTimes(1); // confirmation step first, nothing sent yet
  fireEvent.click(screen.getByRole("button", { name: "Yes, cancel" }));
  await waitFor(() => expect(screen.getByText("Cancelled")).toBeDefined());
});

test("R6.3: an unknown booking shows the server's message", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ errors: [{ code: "NOT_FOUND", message: "Booking not found." }] }, { status: 404 })));
  render(<MyBooking />);
  fireEvent.click(screen.getByRole("button", { name: "Find booking" }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Booking not found.");
});
