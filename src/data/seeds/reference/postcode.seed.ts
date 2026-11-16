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

  const berlinRows = [
    ...new Map(
      ((await fetchJsonFromUrl(seedPLZFile)) as PLZJSON[]).map((row) => [
        row.plz,
        row,
      ]),
    ).values(),
  ];
  const referenceValues = new Set(
    (await fetchJsonFromUrl(seedAllPLZFile)) as string[],
  );
  berlinRows.forEach(({ plz }) => referenceValues.add(plz));

  try {
    await dataSource.transaction(async (manager) => {
      await manager.query(
        `
        INSERT INTO postcode (value, latitude, longitude)
        SELECT value, latitude, longitude
          FROM unnest($1::varchar[], $2::numeric[], $3::numeric[])
               AS t(value, latitude, longitude)
        ON CONFLICT (value) DO UPDATE
           SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude
         WHERE postcode.latitude IS NULL AND postcode.longitude IS NULL
        `,
        [
          berlinRows.map(({ plz }) => plz),
          berlinRows.map(({ latitude }) => latitude),
          berlinRows.map(({ longitude }) => longitude),
        ],
      );
      await manager.query(
        `INSERT INTO postcode (value) VALUES ($1) ON CONFLICT (value) DO NOTHING`,
        [placeholderPostcode],
      );
      await manager.query(
        `
        INSERT INTO postcode (value, is_reference)
        SELECT value, true FROM unnest($1::varchar[]) AS t(value)
        ON CONFLICT (value) DO UPDATE SET is_reference = true
        `,
        [[...referenceValues]],
      );
    });
  } catch (error) {
    throw new Error(`Error seeding postcodes: ${error.message}`);
  }
}
