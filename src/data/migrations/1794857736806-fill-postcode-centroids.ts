import { readFileSync } from "fs";
import path from "path";
import { MigrationInterface, QueryRunner } from "typeorm";

const dataDir = path.join(__dirname, "..", "..", "..", "public", "data");

interface PLZRow {
  plz: string;
  latitude: number;
  longitude: number;
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(dataDir, file), "utf-8"));
}

function columns(rows: PLZRow[]): [string[], number[], number[]] {
  return [
    rows.map(({ plz }) => plz),
    rows.map(({ latitude }) => latitude),
    rows.map(({ longitude }) => longitude),
  ];
}

function centroids(): PLZRow[] {
  const rows = new Map<string, PLZRow>();
  for (const file of ["plzs-all-de.json", "PLZs.json"]) {
    for (const row of readJson<PLZRow[]>(file)) {
      rows.set(row.plz, row);
    }
  }
  return [...rows.values()];
}

export class FillPostcodeCentroids1794857736806 implements MigrationInterface {
  name = "FillPostcodeCentroids1794857736806";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE postcode p
         SET latitude = t.latitude, longitude = t.longitude
        FROM unnest($1::varchar[], $2::numeric[], $3::numeric[])
             AS t(value, latitude, longitude)
       WHERE p.value = t.value
         AND p.latitude IS NULL AND p.longitude IS NULL
      `,
      columns(centroids()),
    );
  }

  // Also clears seeded centroids: the seed writes the same file values.
  public async down(queryRunner: QueryRunner): Promise<void> {
    const berlin = new Set(
      readJson<PLZRow[]>("PLZs.json").map(({ plz }) => plz),
    );
    await queryRunner.query(
      `
      UPDATE postcode p
         SET latitude = NULL, longitude = NULL
        FROM unnest($1::varchar[], $2::numeric[], $3::numeric[])
             AS t(value, latitude, longitude)
       WHERE p.value = t.value
         AND p.latitude = t.latitude AND p.longitude = t.longitude
      `,
      columns(
        readJson<PLZRow[]>("plzs-all-de.json").filter(
          ({ plz }) => !berlin.has(plz),
        ),
      ),
    );
  }
}
