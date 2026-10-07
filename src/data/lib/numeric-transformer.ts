import { ValueTransformer } from "typeorm";

export const numericTransformer: ValueTransformer = {
  to: (v?: number | null) => v,
  from: (v?: string | null) => (v === null || v === undefined ? v : Number(v)),
};
