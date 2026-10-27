import Link from "next/link";
import { formatEur } from "@/lib/display";
import type { Bike } from "@/lib/types";

const TYPE_LABEL: Record<Bike["type"], string> = { city: "City", trekking: "Trekking", "e-bike": "E-bike", cargo: "Cargo" };

export function BikeCard({ bike }: { bike: Bike }) {
  return (
    <li className="flex flex-col rounded-xl border border-black/10 p-4 dark:border-white/15">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{bike.name}</h2>
        <span className="font-semibold">
          {formatEur(bike.pricePerDay)}
          <span className="text-sm font-normal opacity-70"> / day</span>
        </span>
      </div>
      <p className="mt-1 text-sm opacity-70">{TYPE_LABEL[bike.type]}</p>
      <ul className="mt-3 flex flex-wrap gap-2 text-xs" aria-label="Fits">
        {bike.hasTrailerHitch && <li className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-900">Trailer hitch</li>}
        {bike.hasFrontRack && <li className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-900">Front rack</li>}
      </ul>
      <Link href={`/book/${bike.id}`} className="mt-4 self-start rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
        Book this bike
      </Link>
    </li>
  );
}
