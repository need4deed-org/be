// Wide random space (not Date.now()-derived) for test fixture values that
// must be unique per test run — e.g. a postcode value. Date.now() % 10000
// only has 10,000 possible values and is correlated across parallel Vitest
// workers that start at nearly the same wall-clock moment, so two workers
// can collide on the same value (be#864).
export function randomNumericSuffix(digits = 6): string {
  const max = 10 ** digits;
  return String(Math.floor(Math.random() * max)).padStart(digits, "0");
}
