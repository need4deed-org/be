import { DataSource } from "typeorm";
import { seedPLZFile } from "../../../config/constants";
import logger from "../../../logger";
import Postcode from "../../entity/location/postcode.entity";
import { fetchJsonFromUrl, getRepository } from "../../utils";
import { getCount } from "../utils";

interface PLZJSON {
  plz: string;
  latitude: number;
  longitude: number;
}

export async function seedPostcode(dataSource: DataSource): Promise<void> {
  if (!dataSource) {
    throw new Error("DataSource is not initialized.");
  }

  const postcodeRepository = getRepository(dataSource, Postcode);

  const count = await getCount(postcodeRepository);
  if (count !== 0) {
    logger.info("Skipping seeding postcodes.");
    return;
  }

  const plzs = (await fetchJsonFromUrl(seedPLZFile)) as PLZJSON[];

  const postcodesByValue = new Map<string, Postcode>([
    ["12345", new Postcode({ value: "12345" })],
  ]);
  for (const { plz: value, latitude, longitude } of plzs) {
    postcodesByValue.set(value, new Postcode({ value, latitude, longitude }));
  }
  const postcodesForInsert = [...postcodesByValue.values()];

  try {
    await postcodeRepository.insert(postcodesForInsert);
  } catch (error) {
    throw new Error(`Error inserting postcodes: ${error.message}`);
  }
}
