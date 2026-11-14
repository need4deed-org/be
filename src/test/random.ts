import { readFileSync } from "fs";
import path from "path";

// Math.random, not Date.now(): parallel workers start at nearly the same moment and collide.
export function randomNumericSuffix(digits = 6): string {
  const max = 10 ** digits;
  return String(Math.floor(Math.random() * max)).padStart(digits, "0");
}

let referencePostcodes: Set<string> | undefined;

function getReferencePostcodes(): Set<string> {
  referencePostcodes ??= new Set(
    (
      JSON.parse(
        readFileSync(
          path.join(
            __dirname,
            "..",
            "..",
            "public",
            "data",
            "plzs-all-de.json",
          ),
          "utf-8",
        ),
      ) as { plz: string }[]
    ).map(({ plz }) => plz),
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
