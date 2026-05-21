import { Voidable } from "../../server/utils";
import { dataSource } from "../data-source";
import District from "../entity/location/district.entity";
import Postcode from "../entity/location/postcode.entity";
import DistrictPostcode from "../entity/m2m/district-postcode";
import { getRepository } from "./get-repository";

export async function getDistrictFromPostcode(
  postcode: Voidable<Postcode>,
): Promise<District | null> {
  let postcodeId = postcode?.id;
  if (!postcodeId && postcode?.value) {
    const postcodeRepository = getRepository(dataSource, Postcode);
    const postcodeEntity = await postcodeRepository.findOne({
      where: { value: postcode.value },
    });
    postcodeId = postcodeEntity?.id;
  }
  if (postcodeId) {
    const districtPostcodeRepository = getRepository(
      dataSource,
      DistrictPostcode,
    );
    const districtPostcode = await districtPostcodeRepository.findOne({
      where: { postcodeId: postcodeId },
      relations: ["district"],
    });
    if (districtPostcode) {
      return districtPostcode.district;
    }
  }
  return null;
}

export async function getDistrictByTitle(
  title: string,
): Promise<District | null> {
  const districtRepository = getRepository(dataSource, District);
  const district = await districtRepository.findOne({
    where: { title },
  });
  return district;
}
