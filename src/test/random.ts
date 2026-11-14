import { readFileSync } from "fs";
import { seedAllPLZFile } from "../config/constants";

// Math.random, not Date.now(): parallel workers start at nearly the same moment and collide.
export function randomNumericSuffix(digits = 6): string {
  const max = 10 ** digits;
  return String(Math.floor(Math.random() * max)).padStart(digits, "0");
}

let referencePostcodes: Set<string> | undefined;

function getReferencePostcodes(): Set<string> {
  referencePostcodes ??= new Set(
    JSON.parse(readFileSync(seedAllPLZFile, "utf-8")) as string[],
  );
  return referencePostcodes;
}

export function randomNonReferencePostcode(prefix = ""): string {
  const reference = getReferencePostcodes();
  for (;;) {
    const value = `${prefix}${randomNumericSuffix(5 - prefix.length)}`;
    if (!reference.has(value)) {
      return value;
    }
  }
}
