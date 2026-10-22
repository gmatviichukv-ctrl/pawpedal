import { randomInt } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { makeRef } from "@/lib/ref";
import type { Booking } from "@/lib/types";

const DEFAULT_FILE = ".data/bookings.json";

const filePath = () => process.env.BOOKINGS_FILE ?? DEFAULT_FILE;

/** Cryptographically random ref (spec §5.2). */
export const newRef = () => makeRef(() => randomInt(2 ** 32) / 2 ** 32);

async function load(): Promise<Booking[]> {
  try {
    return JSON.parse(await readFile(filePath(), "utf8")) as Booking[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

// Atomic write: temp file in the same directory, then rename over the target.
async function save(bookings: Booking[]): Promise<void> {
  const file = filePath();
  await mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${newRef()}.tmp`;
  await writeFile(tmp, JSON.stringify(bookings, null, 2));
  await rename(tmp, file);
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
