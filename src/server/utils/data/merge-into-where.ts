import { And, Equal, FindOperator, FindOptionsWhere } from "typeorm";

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

export function andIntoWhere<T>(
  where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  key: keyof T & string,
  operator: FindOperator<unknown>,
): void {
  const branches = Array.isArray(where) ? where : [where];
  for (const branch of branches) {
    const target = branch as Record<string, unknown>;
    const existing = target[key];
    target[key] =
      existing === undefined
        ? operator
        : And(
            existing instanceof FindOperator ? existing : Equal(existing),
            operator,
          );
  }
}
