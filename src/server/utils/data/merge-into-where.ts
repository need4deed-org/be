import { FindOperator, FindOptionsWhere } from "typeorm";

function isPlainMergeableObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof FindOperator)
  );
}

// Recurses into shared keys that are themselves plain relation-shaped
// objects (e.g. both sides constrain `deal`), so that e.g. an extra
// `{ deal: { dealLanguage: ... } }` combines with an existing
// `{ deal: { dealDistrict: ... } }` instead of one replacing the other.
// Anything else (arrays, TypeORM FindOperators like In()/ILike(), or a
// plain value) is an overwrite — merging into a FindOperator isn't
// meaningful, and an overwrite is what mergeIntoWhere's one current use
// (replacing any existing `agent` scope with the caller's own) wants.
function mergeValue(base: unknown, extra: unknown): unknown {
  if (isPlainMergeableObject(base) && isPlainMergeableObject(extra)) {
    const merged: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(extra)) {
      merged[key] = key in merged ? mergeValue(merged[key], value) : value;
    }
    return merged;
  }
  return extra;
}

// A filter-builder (e.g. getOpportunityWhere) can return an array of
// alternative FindOptionsWhere instead of a single object — one per OR
// branch, needed when a filter matches across differently-shaped relations
// (be#1018's district filter). A caller-scoping condition applied on top
// (e.g. an AGENT restricted to their own agent) must AND onto every branch,
// or a scoped caller would see rows that only match through an unscoped
// one — and must combine with, not silently drop, whatever that branch
// already constrains under the same key (be#1018 was itself a bug of that
// shape, just via object-spread instead of Object.assign).
export function mergeIntoWhere<T>(
  where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  extra: FindOptionsWhere<T>,
): void {
  const branches = Array.isArray(where) ? where : [where];
  for (const branch of branches) {
    const target = branch as Record<string, unknown>;
    for (const [key, value] of Object.entries(extra)) {
      target[key] = key in target ? mergeValue(target[key], value) : value;
    }
  }
}
