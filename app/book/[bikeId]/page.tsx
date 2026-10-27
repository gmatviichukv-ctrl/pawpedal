import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { todayIn } from "@/lib/rules";
import { catalog, SHOP_TIME_ZONE } from "@/server/catalog";
import { BookingForm } from "./BookingForm";

export function generateStaticParams() {
  return catalog.bikes.map((b) => ({ bikeId: b.id }));
}

// "Today" must be computed per request, not frozen at build time.
async function Form({ bikeId }: { bikeId: string }) {
  await connection();
  const bike = catalog.bikes.find((b) => b.id === bikeId)!;
  return <BookingForm bike={bike} gear={catalog.gear} today={todayIn(SHOP_TIME_ZONE, new Date())} />;
}

export default async function BookPage({ params }: PageProps<"/book/[bikeId]">) {
  const { bikeId } = await params;
  const bike = catalog.bikes.find((b) => b.id === bikeId);
  if (!bike) notFound();
  return (
    <main>
      <Link href="/" className="text-sm underline">← All bikes</Link>
      <h1 className="mt-2 text-2xl font-bold">Book: {bike.name}</h1>
      <div className="mt-6">
        <Suspense fallback={<p>Loading form…</p>}>
          <Form bikeId={bike.id} />
        </Suspense>
      </div>
    </main>
  );
}
