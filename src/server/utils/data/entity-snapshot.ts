import { FindOptionsWhere } from "typeorm";
import { dataSource } from "../../../data/data-source";
import { getRepository } from "../../../data/utils";
import logger from "../../../logger";

const IGNORED_KEYS = new Set(["id", "createdAt", "updatedAt", "addressId"]);

function canonical(value: unknown, ignored: ReadonlySet<string>): unknown {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (Array.isArray(value)) {
    return value.map((item) => JSON.stringify(canonical(item, ignored))).sort();
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !ignored.has(key))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item, ignored)]),
    );
  }
  return value;
}

export async function getEntitySnapshot<E extends { id: number }>(
  entity: new () => E,
  id: number,
  relations: string[],
  ignoredKeys: string[] = [],
): Promise<string> {
  const row = await getRepository(dataSource, entity).findOne({
    where: { id } as FindOptionsWhere<E>,
    relations,
    relationLoadStrategy: "query",
  });
  return JSON.stringify(
    canonical(row, new Set([...IGNORED_KEYS, ...ignoredKeys])),
  );
}

export async function alertOnChange(
  changed: () => Promise<boolean>,
  alert: () => Promise<void>,
): Promise<void> {
  try {
    if (await changed()) {
      await alert();
    }
  } catch (error) {
    logger.error(`Edit ops alert failed: ${error}`);
  }
}
