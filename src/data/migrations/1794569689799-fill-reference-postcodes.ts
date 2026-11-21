import { readFileSync } from "fs";
import path from "path";
import { MigrationInterface, QueryRunner } from "typeorm";

const dataDir = path.join(__dirname, "..", "..", "..", "public", "data");

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(dataDir, file), "utf-8"));
}

export class FillReferencePostcodes1794569689799 implements MigrationInterface {
  name = "FillReferencePostcodes1794569689799";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const values = new Set<string>();
    for (const file of ["plzs-all-de.json", "PLZs.json"]) {
      for (const { plz } of readJson<{ plz: string }[]>(file)) {
        values.add(plz);
      }
    }

    await queryRunner.query(
      `
      INSERT INTO postcode (value, is_reference)
      SELECT value, true FROM unnest($1::varchar[]) AS t(value)
      ON CONFLICT (value) DO UPDATE SET is_reference = true
      `,
      [[...values]],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE postcode SET is_reference = false`);
  }
}
