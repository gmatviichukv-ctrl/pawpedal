import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "PawPedal — bike & dog gear rental",
  description: "Rent a bike together with a trailer, basket or leash mount for your dog.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-black/10 dark:border-white/15">
          <nav className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3 text-sm font-semibold">
            <Link href="/" className="text-base">🐕🚲 PawPedal</Link>
            <Link href="/">Bikes</Link>
            <Link href="/booking">My booking</Link>
          </nav>
        </header>
        <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
