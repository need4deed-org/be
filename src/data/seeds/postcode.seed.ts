import { DataSource } from "typeorm";

import { seedPLZFile } from "../../config/constants";
import Postcode from "../entity/location/postcode.entity";
import { readJsonAsync } from "../utils";
import { getCount } from "./utils";

interface PLZJSON {
  plz: string;
  latitude: number;
  longitude: number;
}

export async function seedPostcode(dataSource: DataSource): Promise<void> {
  if (!dataSource) {
    throw new Error("DataSource is not initialized.");
  }

  const postcodeRepository = dataSource.getRepository(Postcode);
  if (!postcodeRepository) {
    throw new Error("Postcode entity is not initialized.");
  }

  const count = await getCount(postcodeRepository);
  if (count !== 0) {
    dataSource.logger.log("log", "Skipping seeding postcodes.");
    return;
  }

  const plzs = (await readJsonAsync(seedPLZFile)) as PLZJSON[];

  const existingPostcodes = new Set(
    (await postcodeRepository.find()).map((postcode) => postcode.value),
  );

  const postcodesForInsert = plzs.reduce(
    (result: Postcode[], { plz: value, latitude, longitude }) => {
      if (existingPostcodes.has(value)) {
        return result;
      }
      try {
        const newPostcode = new Postcode({
          value,
          latitude,
          longitude,
        });
        result.push(newPostcode);
      } catch (error) {
        throw new Error(
          `Error creating new postcode ${value}: ${error.message}`,
        );
      }
      return result;
    },
    [],
  );

  try {
    await postcodeRepository.insert(postcodesForInsert);
  } catch (error) {
    throw new Error(`Error inserting postcodes: ${error.message}`);
  }
}
