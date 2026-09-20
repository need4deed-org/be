import { FindOptionsWhere } from "typeorm";

// A filter-builder (e.g. getOpportunityWhere) can return an array of
// alternative FindOptionsWhere instead of a single object — one per OR
// branch, needed when a filter matches across differently-shaped relations
// (be#1018's district filter). A caller-scoping condition applied on top
// (e.g. an AGENT restricted to their own agent) must AND onto every branch,
// or a scoped caller would see rows that only match through an unscoped one.
export function mergeIntoWhere<T>(
  where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  extra: FindOptionsWhere<T>,
): void {
  if (Array.isArray(where)) {
    where.forEach((branch) => Object.assign(branch, extra));
  } else {
    Object.assign(where, extra);
  }
}
