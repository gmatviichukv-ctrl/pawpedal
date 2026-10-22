# PawPedal — Specification

> Spec-driven development: this file is written and committed **before any code**.
> When reality disagrees with the spec, we stop, record the change in the **Changelog** at the bottom,
> and only then change code. The spec is never silently rewritten to match the code.

Status: **v1.3** (see Changelog). Items marked **[OWNER]** were decided by the owner
(Halyna), not by the agent.

## 1. Problem

People who cycle with their dog need two things at once: a bike *and* the right dog gear (a trailer for a big dog,
a front basket for a small one, a leash mount for a dog that runs alongside). Bike rentals rarely rent dog gear, and
when they do, it is not clear which gear fits which bike or whether it is free on the dates you need.

## 2. Goal

A small web app where a customer can, without an account:

1. see the bikes and the dog gear available to rent;
2. pick a bike, dates and gear, and see the exact price before booking;
3. book — and be told clearly why not, if the combination or dates are impossible;
4. look up the booking later by its reference and cancel it.

## 3. Non-goals (v1)

User accounts and login · online payment · a shop-owner admin UI (data is edited in JSON files) · multiple shops or
cities · email/SMS notifications · a production database or multi-server deployment.

## 4. Users

- **Customer** — anyone with the link. Books and cancels.
- **Shop owner** — edits `data/catalog.json` by hand in v1.

## 5. Domain

### 5.1 Catalog (`data/catalog.json`, read-only at runtime)

**Bike** — `id`, `name`, `type` (`city` | `trekking` | `e-bike` | `cargo`), `pricePerDay` (cents), `hasTrailerHitch`
(bool), `hasFrontRack` (bool), `photo?`.

**Gear** — `id`, `name`, `kind` (`trailer` | `basket` | `leash-mount` | `vest`), `pricePerDay` (cents), `stock` (units),
`maxDogWeightKg?`.

Seed data: 4 bikes, 4 gear items (one of each kind).

### 5.2 Booking (stored in `.data/bookings.json`, not in git)

`ref` (8 uppercase letters/digits, no ambiguous `0 O 1 I`), `bikeId`, `gearIds[]` (may be empty), `from`, `to`
(`YYYY-MM-DD`, both inclusive), `dogWeightKg?` (required when any gear is booked), `customerName`, `customerEmail`, `status` (`active` | `cancelled`),
`totalCents`, `createdAt`, `cancelledAt?`.

## 6. Functional requirements

Every requirement has an ID. Every ID gets at least one test whose name starts with that ID (e.g. `R3.2: …`).

### R1 — Catalog
- **R1.1** `GET /api/catalog` returns all bikes and gear.
- **R1.2** The home page lists bikes with price per day and badges for "trailer hitch" / "front rack".

### R2 — Price quote (pure function `quote()`)
- **R2.1** Days = calendar days from `from` to `to`, **both inclusive** (Mon→Wed = 3).
- **R2.2** Subtotal = (bike per day + sum of gear per day) × days. All money is **integer cents** — no floats.
- **R2.3** **[OWNER]** Long-rental discount: **7+ days → 10 % off** the subtotal. The discount is rounded to the
  nearest cent (half a cent goes to the customer); total = subtotal − discount.
- **R2.4** The quote shows: days, subtotal, discount, total.

### R3 — Booking rules (pure function `validateBooking()`)
- **R3.1** Dates must be real `YYYY-MM-DD` dates; `to >= from`.
- **R3.2** `from` is not before *today*. "Today" is passed in as a parameter (never read from the clock inside
  domain logic) and is computed in the shop's time zone **[OWNER: Europe/Madrid]**.
- **R3.3** Maximum rental: **[OWNER] 30 days**.
- **R3.4** A **trailer** requires a bike with `hasTrailerHitch`. A **basket** requires a bike with `hasFrontRack`.
- **R3.5** Gear with `maxDogWeightKg` cannot be booked for a heavier dog (e.g. a basket is max 8 kg).
- **R3.6** Gear is **optional** — a bike-only rental is allowed **[OWNER]**. When any gear is booked,
  `dogWeightKg` is required and must be 1–90.
- **R3.7** The same gear id twice in one booking is an error.
- **R3.8** Name is 2–80 characters after trimming; email (trimmed) contains one `@` with text on both sides and
  *(v1.3)* no whitespace inside.
- **R3.9** Every error has a stable `code` (for tests) and a human-readable `message` in English. All errors are
  returned together, not only the first one.

### R4 — Availability (pure function `checkAvailability()`)
- **R4.1** Two date ranges overlap when they share at least one day (inclusive).
- **R4.2** A bike is unavailable if it has an **active** booking that overlaps.
- **R4.3** A gear item is unavailable if the number of **active** overlapping bookings containing it `>= stock`.
- **R4.4** Cancelled bookings never block anything.
- **R4.5** Check-and-save is atomic: two simultaneous requests for the last unit must result in exactly one
  booking.

### R5 — Booking API
- **R5.1** `POST /api/quote` → `200 { quote, errors }` — lets the form show the price and problems live.
- **R5.2** `POST /api/bookings` → `201 { booking }`; `400 { errors }` for rule violations; `409 { errors }` when
  not available; malformed JSON → `400`, never `500`.
- **R5.3** *(v1.2)* `GET /api/bookings/:ref?email=…` → `200 { booking }` only when the email matches
  (case-insensitive); otherwise `404` — the same response as an unknown ref. The reference is case-insensitive.
- **R5.4** `POST /api/bookings/:ref/cancel` with `{ email }` → `200 { booking }` with `status: "cancelled"`;
  `404` for an unknown ref **or a wrong email** (same response — do not reveal which refs exist);
  `409` if already cancelled or if the rental has **already ended** (`today > to`). Cancelling is allowed any time
  before the end, including during the rental **[OWNER]**. Refunds are out of scope (no payments in v1).

### R6 — UI
- **R6.1** `/` — bike list → `/book/:bikeId` form: dates, dog weight, gear checkboxes (gear that cannot fit this
  bike is shown disabled with the reason), name, email. Price and errors update as the form changes (via R5.1).
- **R6.2** After booking, a confirmation page shows the **full** reference, a copy button, and the summary.
- **R6.3** `/booking` — enter reference + email → details → "Cancel booking" with a confirmation step.
- **R6.4** Usable on a phone (single column under 640 px); every input has a label.

## 7. Quality requirements

- **Q1** One command checks everything: `pnpm check` = typecheck + lint + tests. It must be green before any commit
  is called done.
- **Q2** Domain logic (`lib/`) is pure and has no React/Next imports, so it is tested without a browser or server.
- **Q3** API routes are tested by calling the route handlers directly, with a temporary bookings file.
- **Q4** No secrets are needed to run the app; `.env*` files are never read by agents.

## 8. Acceptance (end-to-end, checked by a human in the browser)

1. Book the cargo bike + trailer for a 25 kg dog, 7 days → total shows a 10 % discount → confirmation with ref.
2. Try a basket on a bike without a front rack → the basket is disabled with the reason.
3. Book the last trailer twice for overlapping dates → second attempt says it is not available.
4. Look up the ref with a wrong email → "not found"; with the right email → details → cancel → status cancelled,
   and the trailer becomes available again for those dates.

## 9. Open questions for the owner

None open. All four were answered on 2026-10-22 — see Changelog v1.1.

## Changelog

- v1 — initial spec (agent draft).
- v1.1 — owner decisions (2026-10-22):
  - R2.3 / R3.3: **kept** the agent's proposal — 10 % off from 7 days, max 30 days.
  - R3.6: **changed** — the agent proposed "gear required"; the owner chose **bike-only rentals are allowed**.
    Consequence: dog weight is only required when gear is booked.
  - R5.4: **changed** — the agent proposed "no cancelling on/after the start date"; the owner chose **cancel any
    time before the rental ends**.
  - R3.2: kept Europe/Madrid as the shop time zone.
- v1.2 — found while designing the "My booking" screen (R6.3): R5.3 let anyone who knows a ref read the
  customer's name and email, while R6.3 already asks for the email. R5.3 now requires the email, with the same
  404 for "wrong email" and "unknown ref" as cancel (R5.4).
- v1.3 — independent review (docs/reviews/20261022T080614Z-review.md, finding #1): R3.8 allowed `a b@c.com`.
  Now: no whitespace inside the email; surrounding spaces and the name are trimmed (already the behaviour).
