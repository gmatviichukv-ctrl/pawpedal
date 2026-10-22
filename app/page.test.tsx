import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "./page";

test("R1.2: home lists every bike with its price per day and fit badges", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { level: 1, name: "PawPedal" })).toBeDefined();
  const cards = screen.getAllByRole("link", { name: "Book this bike" });
  expect(cards).toHaveLength(4);
  const cargo = screen.getByRole("heading", { name: "Longtail Cargo" }).closest("li")!;
  expect(within(cargo).getByText("€38.00")).toBeDefined();
  expect(within(cargo).getByText("Trailer hitch")).toBeDefined();
  expect(within(cargo).getByText("Front rack")).toBeDefined();
  const city = screen.getByRole("heading", { name: "City Classic" }).closest("li")!;
  expect(within(city).queryByText("Trailer hitch")).toBeNull();
});
