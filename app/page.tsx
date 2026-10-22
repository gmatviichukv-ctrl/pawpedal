import { catalog } from "@/server/catalog";
import { BikeCard } from "./components/BikeCard";

export default function Home() {
  return (
    <main>
      <h1 className="text-2xl font-bold">PawPedal</h1>
      <p className="mt-1 opacity-80">Rent a bike together with the right gear for your dog — trailer, basket or leash mount.</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {catalog.bikes.map((b) => (
          <BikeCard key={b.id} bike={b} />
        ))}
      </ul>
    </main>
  );
}
