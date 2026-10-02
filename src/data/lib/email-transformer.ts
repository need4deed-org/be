import { ValueTransformer } from "typeorm";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const emailTransformer: ValueTransformer = {
  to: (v?: string | null) => (typeof v === "string" ? normalizeEmail(v) : v),
  from: (v?: string | null) => v,
};
