import { ValueTransformer } from "typeorm";

// Coerces the pg driver's string return for numeric/decimal columns to a
// number (nullable-safe — null/undefined pass through unchanged). Shared by
// every numeric/decimal column that needs it (e.g. ActivityLog.hours,
// Postcode.latitude/longitude) instead of a one-off inline transformer per
// column.
export const numericTransformer: ValueTransformer = {
  to: (v?: number | null) => v,
  from: (v?: string | null) => (v === null || v === undefined ? v : Number(v)),
};
