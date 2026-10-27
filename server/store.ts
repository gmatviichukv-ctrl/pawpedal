import { randomInt } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { makeRef } from "@/lib/ref";
import type { Booking } from "@/lib/types";

// The default path is statically scoped to .data/ so `next build` does not trace the whole project into the
// server bundle. BOOKINGS_FILE (used by tests) is a runtime value, so those fs calls carry turbopackIgnore.
const filePath = () => process.env.BOOKINGS_FILE ?? join(process.cwd(), ".data", "bookings.json");

/** Cryptographically random ref (spec §5.2). */
export const newRef = () => makeRef(() => randomInt(2 ** 32) / 2 ** 32);

async function load(): Promise<Booking[]> {
  try {
    return JSON.parse(await readFile(/*turbopackIgnore: true*/ filePath(), "utf8")) as Booking[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

// Atomic write: temp file in the same directory, then rename over the target.
async function save(bookings: Booking[]): Promise<void> {
  const file = filePath();
  await mkdir(/*turbopackIgnore: true*/ dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${newRef()}.tmp`;
  await writeFile(/*turbopackIgnore: true*/ tmp, JSON.stringify(bookings, null, 2));
  await rename(/*turbopackIgnore: true*/ tmp, file);
}

// One chain of work at a time, so read-check-write cannot interleave (R4.5).
let queue: Promise<unknown> = Promise.resolve();

/**
 * Runs `fn` with the current bookings while holding the lock. If `fn` returns a new list it is saved;
 * returning `undefined` for `bookings` leaves the file untouched.
 */
export function transact<T>(fn: (bookings: Booking[]) => { bookings?: Booking[]; result: T }): Promise<T> {
  const run = queue.then(async () => {
    const out = fn(await load());
    if (out.bookings) await save(out.bookings);
    return out.result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function findBooking(ref: string): Promise<Booking | undefined> {
  return transact((bookings) => ({ result: bookings.find((b) => b.ref === ref) }));
}
