import { dataSource } from "../data-source";
import Postcode from "../entity/location/postcode.entity";
import { getRepository } from "./get-repository";

export async function getPostcode(code: string): Promise<Postcode | null> {
  const postcodeRepository = getRepository(dataSource, Postcode);

  let postcode = await postcodeRepository.findOneBy({ value: code });

  if (!postcode) {
    postcode = new Postcode({ value: code });
    await postcodeRepository.save(postcode);
  }

  return postcode;
}
