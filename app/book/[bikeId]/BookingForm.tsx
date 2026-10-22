"use client";

import { useEffect, useState } from "react";
import { formatEur, gearFit } from "@/lib/display";
import type { Bike, Booking, DomainError, Gear, Quote } from "@/lib/types";

const field = "w-full rounded-lg border border-black/20 bg-transparent px-3 py-2 dark:border-white/25";
const label = "block text-sm font-medium";

type Submit = { kind: "idle" } | { kind: "sending" } | { kind: "done"; booking: Booking } | { kind: "failed"; errors: DomainError[] };

export function BookingForm({ bike, gear, today }: { bike: Bike; gear: Gear[]; today: string }) {
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [gearIds, setGearIds] = useState<string[]>([]);
  const [dogWeight, setDogWeight] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [problems, setProblems] = useState<DomainError[]>([]);
  const [submit, setSubmit] = useState<Submit>({ kind: "idle" });
  const [copied, setCopied] = useState(false);

  const request = {
    bikeId: bike.id,
    gearIds,
    from,
    to,
    dogWeightKg: dogWeight === "" ? undefined : Number(dogWeight),
    customerName: name,
    customerEmail: email,
  };
  const requestKey = JSON.stringify(request);

  // R6.1: price and problems update as the form changes (debounced call to R5.1).
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/quote", { method: "POST", body: requestKey, signal: ctrl.signal });
        const body = await res.json();
        setQuote(body.quote ?? null);
        setProblems((body.errors ?? []).filter((e: DomainError) => e.code !== "INVALID_NAME" && e.code !== "INVALID_EMAIL"));
      } catch {
        /* aborted or offline — the submit step reports real errors */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [requestKey]);

  const toggle = (id: string) => setGearIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmit({ kind: "sending" });
    try {
      const res = await fetch("/api/bookings", { method: "POST", body: requestKey });
      const body = await res.json();
      setSubmit(res.ok ? { kind: "done", booking: body.booking } : { kind: "failed", errors: body.errors ?? [] });
    } catch {
      setSubmit({ kind: "failed", errors: [{ code: "INVALID_REQUEST" as DomainError["code"], message: "The server did not respond. Please try again." }] });
    }
  }

  if (submit.kind === "done") {
    const b = submit.booking;
    return (
      <section aria-live="polite" className="rounded-xl border border-emerald-600/40 p-5">
        <h2 className="text-xl font-bold">Booked! 🐾</h2>
        <p className="mt-2">Your booking reference:</p>
        <div className="mt-1 flex items-center gap-3">
          <code className="rounded bg-black/5 px-3 py-1 text-2xl font-bold tracking-widest dark:bg-white/10">{b.ref}</code>
          <button
            type="button"
            className="rounded-lg border px-3 py-1 text-sm"
            onClick={async () => {
              await navigator.clipboard?.writeText(b.ref);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-4 text-sm">
          {bike.name} · {b.from} → {b.to}
          {b.gearIds.length > 0 && <> · {gear.filter((g) => b.gearIds.includes(g.id)).map((g) => g.name).join(", ")}</>}
        </p>
        <p className="mt-1 font-semibold">Total {formatEur(b.totalCents)}</p>
        <p className="mt-4 text-sm opacity-80">
          Keep the reference — with your email it lets you view or cancel the booking under “My booking”.
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          From
          <input type="date" className={field} min={today} value={from} onChange={(e) => setFrom(e.target.value)} required />
        </label>
        <label className={label}>
          To
          <input type="date" className={field} min={from} value={to} onChange={(e) => setTo(e.target.value)} required />
        </label>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-1 font-semibold">Dog gear (optional)</legend>
        {gear.map((g) => {
          const reason = gearFit(bike, g);
          return (
            <label key={g.id} className={`flex items-start gap-2 text-sm ${reason ? "opacity-50" : ""}`}>
              <input type="checkbox" disabled={reason !== null} checked={gearIds.includes(g.id)} onChange={() => toggle(g.id)} className="mt-1" />
              <span>
                {g.name} · {formatEur(g.pricePerDay)}/day
                {g.maxDogWeightKg && <span className="opacity-70"> · up to {g.maxDogWeightKg} kg</span>}
                {reason && <span className="block text-xs">{reason}</span>}
              </span>
            </label>
          );
        })}
      </fieldset>

      {gearIds.length > 0 && (
        <label className={`${label} sm:w-1/2`}>
          Dog weight (kg)
          <input type="number" inputMode="decimal" min={1} max={90} className={field} value={dogWeight} onChange={(e) => setDogWeight(e.target.value)} />
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Your name
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <label className={label}>
          Email
          <input type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
      </div>

      <section aria-live="polite" aria-label="Price" className="rounded-xl bg-black/5 p-4 dark:bg-white/10">
        {quote ? (
          <dl className="grid grid-cols-2 gap-1 text-sm">
            <dt>Days</dt><dd className="text-right">{quote.days}</dd>
            <dt>Subtotal</dt><dd className="text-right">{formatEur(quote.subtotalCents)}</dd>
            {quote.discountCents > 0 && (<><dt>7+ days discount</dt><dd className="text-right">−{formatEur(quote.discountCents)}</dd></>)}
            <dt className="font-semibold">Total</dt><dd className="text-right font-semibold">{formatEur(quote.totalCents)}</dd>
          </dl>
        ) : (
          <p className="text-sm opacity-70">Choose dates to see the price.</p>
        )}
        {problems.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-sm text-red-700 dark:text-red-400">
            {problems.map((p) => <li key={p.code + p.message}>{p.message}</li>)}
          </ul>
        )}
      </section>

      {submit.kind === "failed" && (
        <ul role="alert" className="list-disc pl-5 text-sm text-red-700 dark:text-red-400">
          {submit.errors.map((p) => <li key={p.code + p.message}>{p.message}</li>)}
        </ul>
      )}

      <button disabled={submit.kind === "sending"} className="justify-self-start rounded-lg bg-emerald-700 px-5 py-2 font-semibold text-white disabled:opacity-50">
        {submit.kind === "sending" ? "Booking…" : "Book"}
      </button>
    </form>
  );
}
