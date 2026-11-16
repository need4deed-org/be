import berlinDistricts from "../../../public/data/districts-berlin.json";
import listedBerlinPLZs from "../../../public/data/PLZs.json";

const listedPLZs = listedBerlinPLZs.map(({ plz }) => plz);
const commuteAreaPLZs = new Set([
  ...berlinDistricts.flatMap(({ plzs }) => plzs),
  ...listedPLZs,
]);

export function getCommuteAreaListedPLZs(): string[] {
  return listedPLZs;
}

export function isInCommuteArea(value: string | undefined): boolean {
  return value !== undefined && commuteAreaPLZs.has(value);
}

export function inCommuteAreaSql(
  postcodeAlias: string,
  listedPLZsParam: string,
): string {
  return `(EXISTS (SELECT 1 FROM district_postcode dp WHERE dp.postcode_id = ${postcodeAlias}.id)
    OR ${postcodeAlias}.value = ANY(${listedPLZsParam}))`;
}
