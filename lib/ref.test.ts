import { expect, test } from "vitest";
import { normalizeRef, REF_ALPHABET, makeRef } from "./ref";

test("R5.3: refs are 8 chars from an alphabet without 0 O 1 I", () => {
  expect(REF_ALPHABET).not.toMatch(/[0O1I]/);
  let seed = 0;
  const ref = makeRef(() => (seed++ % 100) / 100);
  expect(ref).toMatch(new RegExp(`^[${REF_ALPHABET}]{8}$`));
});

test("R5.3: refs differ when randomness differs", () => {
  expect(makeRef(() => 0)).not.toBe(makeRef(() => 0.99));
});

test("R5.3: lookup is case-insensitive and ignores spaces", () => {
  expect(normalizeRef(" abcd efgh ")).toBe("ABCDEFGH");
});
