import berlinDistricts from "../../../public/data/districts-berlin.json";
import listedBerlinPLZs from "../../../public/data/PLZs.json";

const listedPLZs = listedBerlinPLZs.map(({ plz }) => plz);
export const berlinDistrictPLZs = new Set(
  berlinDistricts.flatMap(({ plzs }) => plzs),
);
const commuteAreaPLZs = new Set(listedPLZs);

export function getCommuteAreaListedPLZs(): string[] {
  return listedPLZs;
}

export function isInCommuteArea(value: string | undefined): boolean {
  return value !== undefined && commuteAreaPLZs.has(value);
}

// Outside the commute area a pin falls back to its district centroid (e.g. fallback PLZ 12345).
export function getCommuteAreaCoordinates(postcode?: {
  value?: string;
  latitude?: number | null;
  longitude?: number | null;
}): { latitude: number | null; longitude: number | null } {
  if (!isInCommuteArea(postcode?.value)) {
    return { latitude: null, longitude: null };
  }
  return {
    latitude: postcode?.latitude ?? null,
    longitude: postcode?.longitude ?? null,
  };
}

export function inCommuteAreaSql(
  postcodeAlias: string,
  listedPLZsParam: string,
): string {
  return `(EXISTS (SELECT 1 FROM district_postcode dp WHERE dp.postcode_id = ${postcodeAlias}.id)
    OR ${postcodeAlias}.value = ANY(${listedPLZsParam}))`;
}
