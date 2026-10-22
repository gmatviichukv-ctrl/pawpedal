import { MyBooking } from "./MyBooking";

export default function BookingPage() {
  return (
    <main>
      <h1 className="text-2xl font-bold">My booking</h1>
      <p className="mt-1 mb-6 opacity-80">Enter your booking reference and email to view or cancel it.</p>
      <MyBooking />
    </main>
  );
}
