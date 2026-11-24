export type AssertSameStringValues<A extends string, B extends string> = [
  A,
] extends [B]
  ? [B] extends [A]
    ? true
    : never
  : never;
