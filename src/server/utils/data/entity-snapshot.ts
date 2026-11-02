import { FindOptionsWhere } from "typeorm";
import { dataSource } from "../../../data/data-source";
import { getRepository } from "../../../data/utils";

const IGNORED_KEYS = new Set(["id", "createdAt", "updatedAt", "addressId"]);

function canonical(value: unknown): unknown {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (Array.isArray(value)) {
    return value.map((item) => JSON.stringify(canonical(item))).sort();
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !IGNORED_KEYS.has(key))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value;
}

export async function getEntitySnapshot<E extends { id: number }>(
  entity: new () => E,
  id: number,
  relations: string[],
): Promise<string> {
  const row = await getRepository(dataSource, entity).findOne({
    where: { id } as FindOptionsWhere<E>,
    relations,
  });
  return JSON.stringify(canonical(row));
}
