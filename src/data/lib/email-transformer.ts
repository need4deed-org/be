import { ValueTransformer } from "typeorm";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

// Stores User.email lowercased so its unique index is effectively
// case-insensitive (be#1013). TypeORM also applies `to` to find-where
// values, so `findOneBy({ email })` lookups (login, password reset,
// assertEmailAvailable, ...) match regardless of the caller's casing
// without each call site having to normalize. Nullable-safe; FindOperator
// values (e.g. ILike) are handed to `to` via transformValue and pass
// through as strings too.
export const emailTransformer: ValueTransformer = {
  to: (v?: string | null) => (typeof v === "string" ? normalizeEmail(v) : v),
  from: (v?: string | null) => v,
};
