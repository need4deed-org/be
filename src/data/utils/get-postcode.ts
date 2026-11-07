import { dataSource } from "../data-source";
import Postcode from "../entity/location/postcode.entity";
import { getRepository } from "./get-repository";
import { isValidPLZ } from "./is-valid-plz";

// The legacy volunteer form sends postal_code as a number, which drops the
// leading zero of e.g. 01067; restore it so it matches the real postcode.
export function normalizePostcode(code: string): string {
  const trimmed = code.trim();
  return /^\d{4}$/.test(trimmed) ? `0${trimmed}` : trimmed;
}

export async function getPostcode(
  code: string,
  { createOnlyGerman = false } = {},
): Promise<Postcode | null> {
  const postcodeRepository = getRepository(dataSource, Postcode);
  const value = normalizePostcode(code);

  const stored = await postcodeRepository.findOneBy({ value });
  if (stored) {
    return stored;
  }
  if (createOnlyGerman && !isValidPLZ(value)) {
    return null;
  }
  return postcodeRepository.save(new Postcode({ value }));
}
