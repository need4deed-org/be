import { dataSource } from "../data-source";
import Postcode from "../entity/location/postcode.entity";
import { getRepository } from "./get-repository";

// The legacy volunteer form sends postal_code as a number, which drops the
// leading zero of e.g. 01067; restore it so it matches the real postcode.
export function normalizePostcode(code: string): string {
  const trimmed = code.trim();
  return /^\d{4}$/.test(trimmed) ? `0${trimmed}` : trimmed;
}

export async function getPostcode(code: string): Promise<Postcode | null> {
  const postcodeRepository = getRepository(dataSource, Postcode);
  const value = normalizePostcode(code);

  let postcode = await postcodeRepository.findOneBy({ value });

  if (!postcode) {
    postcode = new Postcode({ value });
    await postcodeRepository.save(postcode);
  }

  return postcode;
}
