import { DataSource, EntityManager } from "typeorm";
import { dataSource } from "../data-source";
import Postcode from "../entity/location/postcode.entity";
import { getRepository } from "./get-repository";
import { isValidPLZ } from "./is-valid-plz";

// Postcodes sent as numbers lose their leading zero (01067 → 1067).
export function normalizePostcode(code: string): string {
  const trimmed = code.trim();
  return /^\d{4}$/.test(trimmed) ? `0${trimmed}` : trimmed;
}

export async function getPostcode(
  code: string,
  {
    createOnlyGerman = false,
    manager = dataSource,
  }: { createOnlyGerman?: boolean; manager?: DataSource | EntityManager } = {},
): Promise<Postcode | null> {
  const postcodeRepository = getRepository(manager, Postcode);
  const value = normalizePostcode(code);
  const raw = code.trim();

  const stored =
    (await postcodeRepository.findOneBy({ value })) ??
    (raw !== value ? await postcodeRepository.findOneBy({ value: raw }) : null);
  if (stored) {
    return stored;
  }
  if (createOnlyGerman && !isValidPLZ(value)) {
    return null;
  }
  await postcodeRepository
    .createQueryBuilder()
    .insert()
    .values({ value })
    .orIgnore()
    .execute();
  return postcodeRepository.findOneByOrFail({ value });
}
