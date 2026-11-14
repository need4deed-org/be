import { readFileSync } from "fs";
import path from "path";
import { MigrationInterface, QueryRunner } from "typeorm";

type PLZRow = { plz: string; latitude: number; longitude: number };

const dataDir = path.join(__dirname, "..", "..", "..", "public", "data");

function readRows(file: string): PLZRow[] {
  return JSON.parse(readFileSync(path.join(dataDir, file), "utf-8"));
}

export class FillReferencePostcodes1794569689799 implements MigrationInterface {
  name = "FillReferencePostcodes1794569689799";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rowsByPLZ = new Map<string, PLZRow>();
    for (const row of readRows("plzs-all-de.json")) {
      rowsByPLZ.set(row.plz, row);
    }
    for (const row of readRows("PLZs.json")) {
      rowsByPLZ.set(row.plz, row);
    }
    const rows = [...rowsByPLZ.values()];

    await queryRunner.query(
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE postcode SET is_reference = false`);
  }
}
