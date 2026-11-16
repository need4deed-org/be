import { DataSource } from "typeorm";
import { seedAllPLZFile, seedPLZFile } from "../../../config/constants";
import { fetchJsonFromUrl } from "../../utils";

interface PLZJSON {
  plz: string;
  latitude: number;
  longitude: number;
}

const placeholderPostcode = "12345";

export async function seedPostcode(dataSource: DataSource): Promise<void> {
  if (!dataSource) {
    throw new Error("DataSource is not initialized.");
  }

  const rowsByPLZ = new Map<string, PLZJSON>();
  for (const file of [seedAllPLZFile, seedPLZFile]) {
    for (const row of (await fetchJsonFromUrl(file)) as PLZJSON[]) {
      rowsByPLZ.set(row.plz, row);
    }
  }
  const rows = [...rowsByPLZ.values()];

  try {
    await dataSource.transaction(async (manager) => {
      await manager.query(
        `
        INSERT INTO postcode (value, latitude, longitude, is_reference)
        SELECT value, latitude, longitude, true
          FROM unnest($1::varchar[], $2::numeric[], $3::numeric[])
               AS t(value, latitude, longitude)
        ON CONFLICT (value) DO UPDATE
           SET is_reference = true,
               latitude = COALESCE(postcode.latitude, EXCLUDED.latitude),
               longitude = COALESCE(postcode.longitude, EXCLUDED.longitude)
        `,
        [
          rows.map(({ plz }) => plz),
          rows.map(({ latitude }) => latitude),
          rows.map(({ longitude }) => longitude),
        ],
      );
      await manager.query(
        `INSERT INTO postcode (value) VALUES ($1) ON CONFLICT (value) DO NOTHING`,
        [placeholderPostcode],
      );
    });
  } catch (error) {
    throw new Error(`Error seeding postcodes: ${error.message}`);
  }
}
