import { DataSource } from "typeorm";
import { seedDistrictFile } from "../../config/constants";
import District from "../entity/location/district.entity";
import Postcode from "../entity/location/postcode.entity";
import DistrictPostcode from "../entity/m2m/district-postcode";
import { getRepository, readJsonAsync } from "../utils";
import { getCount } from "./utils";

interface DistrictJSON {
  district: string;
  plzs: string[];
}

export async function seedDistrict(dataSource: DataSource): Promise<void> {
  if (!dataSource) {
    throw new Error("DataSource is not initialized.");
  }

  const districtRepository = getRepository(dataSource, District);

  const count = await getCount(districtRepository);
  if (count !== 0) {
    dataSource.logger.log("log", "Skipping seeding districts.");
    return;
  }

  const districtPostcodeRepository = dataSource.getRepository(DistrictPostcode);
  if (!districtRepository) {
    throw new Error("Postcode entity is not initialized.");
  }

  const postcodeRepository = dataSource.getRepository(Postcode);
  if (!postcodeRepository) {
    throw new Error("Postcode entity is not initialized.");
  }

  const districts = (await readJsonAsync(seedDistrictFile)) as DistrictJSON[];

  const existingDistrictTitles = new Set(
    (await districtRepository.find()).map((district) => district.title),
  );

  for (const { district: title, plzs } of districts) {
    let newDistrict: District;

    if (existingDistrictTitles.has(title)) {
      continue;
    }

    try {
      newDistrict = new District({ title });
      await districtRepository.save(newDistrict);
    } catch (error) {
      throw new Error(`Error creating new district ${title}: ${error.message}`);
    }

    for (const plz of plzs) {
      const postcode = await postcodeRepository.findOne({
        where: { value: plz },
      });
      if (!postcode) {
        dataSource.logger.log(
          "warn",
          `Postcode ${plz} not found for district ${title}. Skipping.`,
        );
        continue;
      }

      const districtPostcode = new DistrictPostcode({
        districtId: newDistrict.id,
        postcodeId: postcode.id,
      });
      await districtPostcodeRepository.save(districtPostcode);
    }
  }
}
