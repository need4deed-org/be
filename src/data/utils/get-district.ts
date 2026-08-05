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
    // A postcode can map to more than one district (DistrictPostcode is a
    // genuine m2m). Order deterministically so the same postcode always
    // resolves to the same district rather than whatever row Postgres
    // happens to return first (be#827).
    const districtPostcode = await districtPostcodeRepository.findOne({
      where: { postcodeId: postcodeId },
      relations: ["district"],
      order: { id: "ASC" },
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
