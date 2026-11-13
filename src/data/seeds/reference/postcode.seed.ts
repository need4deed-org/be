import { DataSource } from "typeorm";
import { seedAllPLZFile, seedPLZFile } from "../../../config/constants";
import Postcode from "../../entity/location/postcode.entity";
import { fetchJsonFromUrl, getRepository } from "../../utils";

interface PLZJSON {
  plz: string;
  latitude: number;
  longitude: number;
}

const dummyPostcode = "12345";

export async function seedPostcode(dataSource: DataSource): Promise<void> {
  if (!dataSource) {
    throw new Error("DataSource is not initialized.");
  }

  const rowsByPLZ = new Map<string, PLZJSON>();
  for (const row of (await fetchJsonFromUrl(seedAllPLZFile)) as PLZJSON[]) {
    rowsByPLZ.set(row.plz, row);
  }
  for (const row of (await fetchJsonFromUrl(seedPLZFile)) as PLZJSON[]) {
    if (rowsByPLZ.has(row.plz)) {
      rowsByPLZ.set(row.plz, row);
    }
  }
  const rows = [...rowsByPLZ.values()];

  try {
    await dataSource.query(
      `
      INSERT INTO postcode (value, latitude, longitude, is_reference)
      SELECT value, latitude, longitude, true
        FROM unnest($1::varchar[], $2::numeric[], $3::numeric[])
             AS t(value, latitude, longitude)
      ON CONFLICT (value) DO UPDATE
         SET is_reference = true,
             latitude = CASE
               WHEN postcode.latitude IS NULL AND postcode.longitude IS NULL
               THEN EXCLUDED.latitude ELSE postcode.latitude END,
             longitude = CASE
               WHEN postcode.latitude IS NULL AND postcode.longitude IS NULL
               THEN EXCLUDED.longitude ELSE postcode.longitude END
      `,
      [
        rows.map(({ plz }) => plz),
        rows.map(({ latitude }) => latitude),
        rows.map(({ longitude }) => longitude),
      ],
    );
    await getRepository(dataSource, Postcode)
      .createQueryBuilder()
      .insert()
      .values({ value: dummyPostcode })
      .orIgnore()
      .execute();
  } catch (error) {
    throw new Error(`Error seeding postcodes: ${error.message}`);
  }
}
