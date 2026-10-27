export const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REF_LENGTH = 8;

/** `random` returns a number in [0, 1), like Math.random. */
export function makeRef(random: () => number): string {
  let ref = "";
  for (let i = 0; i < REF_LENGTH; i++) ref += REF_ALPHABET[Math.floor(random() * REF_ALPHABET.length)];
  return ref;
}

export function normalizeRef(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}
