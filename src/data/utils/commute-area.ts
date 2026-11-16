import { readFileSync } from "fs";
import { seedPLZFile } from "../../config/constants";

let listedPLZs: string[] | undefined;

export function getCommuteAreaListedPLZs(): string[] {
  listedPLZs ??= (
    JSON.parse(readFileSync(seedPLZFile, "utf-8")) as { plz: string }[]
  ).map(({ plz }) => plz);
  return listedPLZs;
}

export function inCommuteAreaSql(
  postcodeAlias: string,
  listedPLZsParam: string,
): string {
  return `(EXISTS (SELECT 1 FROM district_postcode dp WHERE dp.postcode_id = ${postcodeAlias}.id)
    OR ${postcodeAlias}.value = ANY(${listedPLZsParam}))`;
}
