import { readFileSync } from "fs";
import path from "path";

export function randomNumericSuffix(digits = 6): string {
  const max = 10 ** digits;
  return String(Math.floor(Math.random() * max)).padStart(digits, "0");
}

const referencePostcodes = new Set<string>(
  (
    JSON.parse(
      readFileSync(
        path.join(__dirname, "..", "..", "public", "data", "plzs-all-de.json"),
        "utf-8",
      ),
    ) as { plz: string }[]
  ).map(({ plz }) => plz),
);

export function randomNonReferencePostcode(prefix = ""): string {
  for (;;) {
    const value = `${prefix}${randomNumericSuffix(5 - prefix.length)}`;
    if (!referencePostcodes.has(value)) {
      return value;
    }
  }
}
