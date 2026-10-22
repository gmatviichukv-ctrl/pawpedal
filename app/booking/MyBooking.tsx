"use client";

import { useState } from "react";
import { formatEur } from "@/lib/display";
import type { Booking } from "@/lib/types";

const field = "w-full rounded-lg border border-black/20 bg-transparent px-3 py-2 dark:border-white/25";

type View =
  | { kind: "form"; error?: string }
  | { kind: "loading" }
  | { kind: "found"; booking: Booking; confirming: boolean; error?: string };

export function MyBooking() {
  const [ref, setRef] = useState("");
  const [email, setEmail] = useState("");
  const [view, setView] = useState<View>({ kind: "form" });

  async function lookUp(e: React.FormEvent) {
    e.preventDefault();
    setView({ kind: "loading" });
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(ref.trim())}?email=${encodeURIComponent(email.trim())}`);
      const body = await res.json();
      setView(res.ok ? { kind: "found", booking: body.booking, confirming: false } : { kind: "form", error: body.errors?.[0]?.message ?? "Booking not found." });
    } catch {
      setView({ kind: "form", error: "The server did not respond. Please try again." });
    }
  }

  async function cancel(booking: Booking) {
    try {
      const res = await fetch(`/api/bookings/${booking.ref}/cancel`, { method: "POST", body: JSON.stringify({ email: email.trim() }) });
      const body = await res.json();
      setView(res.ok
        ? { kind: "found", booking: body.booking, confirming: false }
        : { kind: "found", booking, confirming: false, error: body.errors?.[0]?.message ?? "Could not cancel." });
    } catch {
      setView({ kind: "found", booking, confirming: false, error: "The server did not respond. Please try again." });
    }
  }

  if (view.kind === "found") {
    const b = view.booking;
    const cancelled = b.status === "cancelled";
    return (
      <section aria-live="polite" className="rounded-xl border border-black/10 p-5 dark:border-white/15">
        <p className="text-sm opacity-70">Booking</p>
        <p className="text-2xl font-bold tracking-widest">{b.ref}</p>
        <p className={`mt-2 inline-block rounded-full px-3 py-0.5 text-sm font-semibold ${cancelled ? "bg-red-100 text-red-900" : "bg-emerald-100 text-emerald-900"}`}>
          {cancelled ? "Cancelled" : "Active"}
        </p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="opacity-70">Dates</dt><dd>{b.from} → {b.to}</dd>
          <dt className="opacity-70">Bike</dt><dd>{b.bikeId}</dd>
          <dt className="opacity-70">Gear</dt><dd>{b.gearIds.length ? b.gearIds.join(", ") : "none"}</dd>
          <dt className="opacity-70">Total</dt><dd>{formatEur(b.totalCents)}</dd>
        </dl>
        {view.error && <p role="alert" className="mt-3 text-sm text-red-700">{view.error}</p>}
        {!cancelled && !view.confirming && (
          <button type="button" className="mt-5 rounded-lg border border-red-700 px-4 py-2 text-sm font-semibold text-red-700" onClick={() => setView({ ...view, confirming: true, error: undefined })}>
            Cancel booking
          </button>
        )}
        {!cancelled && view.confirming && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-sm">Cancel this booking? This cannot be undone.</span>
            <button type="button" className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => cancel(b)}>
              Yes, cancel
            </button>
            <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => setView({ ...view, confirming: false })}>
              Keep it
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <form onSubmit={lookUp} className="grid max-w-md gap-4">
      <label className="block text-sm font-medium">
        Booking reference
        <input className={`${field} uppercase tracking-widest`} value={ref} onChange={(e) => setRef(e.target.value)} autoComplete="off" />
      </label>
      <label className="block text-sm font-medium">
        Email used for the booking
        <input type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      {view.kind === "form" && view.error && <p role="alert" className="text-sm text-red-700">{view.error}</p>}
      <button disabled={view.kind === "loading"} className="justify-self-start rounded-lg bg-emerald-700 px-5 py-2 font-semibold text-white disabled:opacity-50">
        {view.kind === "loading" ? "Looking up…" : "Find booking"}
      </button>
    </form>
  );
}
