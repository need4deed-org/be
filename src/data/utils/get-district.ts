import { Voidable } from "../../server/utils";
import { dataSource } from "../data-source";
import District from "../entity/location/district.entity";
import Postcode from "../entity/location/postcode.entity";
import DistrictPostcode from "../entity/m2m/district-postcode";
import { getRepository } from "./get-repository";

export async function getDistrictFromPostcode(
  postcode: Voidable<Postcode>,
): Promise<District | null> {
  if (postcode?.id) {
    const districtPostcodeRepository = getRepository(
      dataSource,
      DistrictPostcode,
    );
    const districtPostcode = await districtPostcodeRepository.findOne({
      where: { postcodeId: postcode.id },
      relations: ["district"],
    });
    if (districtPostcode) {
      return districtPostcode.district;
    }
  }
  return null;
}
