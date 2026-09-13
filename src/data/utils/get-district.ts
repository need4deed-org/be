import { In } from "typeorm";
import { Voidable } from "../../server/utils";
import { dataSource } from "../data-source";
import District from "../entity/location/district.entity";
import Postcode from "../entity/location/postcode.entity";
import DistrictPostcode from "../entity/m2m/district-postcode";
import { getRepository } from "./get-repository";

export interface Centroid {
  latitude: number | null;
  longitude: number | null;
}

// Map-pin fallback (be#662) for opportunities whose agent has no geocoded
// address: the arithmetic mean of each district's own geocoded postcodes. A
// district's postcodes span at most a few km in Berlin/Potsdam, so a plain
// lat/lon average is an adequate approximation of a "centroid" — no need for
// a proper geodesic/projected calculation at this scale.
//
// A targeted query for just the district ids that actually need a fallback,
// rather than an eager `district.districtPostcode.postcode` relation on the
// main (paginated) opportunity query — a district can have dozens of
// postcodes, which would multiply result rows on every page even when the
// centroid is never used (most opportunities' agents are already geocoded).
export async function getDistrictCentroids(
  districtIds: number[],
): Promise<Map<number, Centroid>> {
  const result = new Map<number, Centroid>();
  if (!districtIds.length) {
    return result;
  }

  const districtPostcodeRepository = getRepository(
    dataSource,
    DistrictPostcode,
  );
  const rows = await districtPostcodeRepository.find({
    where: { districtId: In(districtIds) },
    relations: ["postcode"],
  });

  const geocodedByDistrict = new Map<number, Postcode[]>();
  for (const row of rows) {
    if (
      row.postcode?.latitude === null ||
      row.postcode?.latitude === undefined ||
      row.postcode?.longitude === null ||
      row.postcode?.longitude === undefined
    ) {
      continue;
    }
    const list = geocodedByDistrict.get(row.districtId) ?? [];
    list.push(row.postcode);
    geocodedByDistrict.set(row.districtId, list);
  }

  for (const districtId of districtIds) {
    const postcodes = geocodedByDistrict.get(districtId);
    if (!postcodes?.length) {
      result.set(districtId, { latitude: null, longitude: null });
      continue;
    }
    result.set(districtId, {
      latitude:
        postcodes.reduce((sum, p) => sum + (p.latitude as number), 0) /
        postcodes.length,
      longitude:
        postcodes.reduce((sum, p) => sum + (p.longitude as number), 0) /
        postcodes.length,
    });
  }

  return result;
}

export async function getDistrictFromPostcode(
  postcode: Voidable<Postcode | number>,
): Promise<District | null> {
  let postcodeId = typeof postcode === "number" ? postcode : postcode?.id;
  if (!postcodeId && typeof postcode === "object" && postcode?.value) {
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
