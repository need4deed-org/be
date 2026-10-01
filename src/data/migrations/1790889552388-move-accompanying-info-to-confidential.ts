import { MigrationInterface, QueryRunner } from "typeorm";

// be#1092: an accompanying opportunity's description belongs in
// info_confidential only, but the writers used to copy it into `info` too
// (and some rows only ever had `info`). For accompanying rows:
//   - info_confidential empty: `info` moves into it
//   - `info` empty or the same text (ignoring surrounding whitespace):
//     `info` is cleared
//   - both set and different: left alone for a coordinator to review; only
//     their ids are logged, never the text
//
// Raw SQL only, no entities. Not reversible: the cleared copies are gone.
export class MoveAccompanyingInfoToConfidential1790889552388
  implements MigrationInterface
{
  name = "MoveAccompanyingInfoToConfidential1790889552388";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "opportunity"
      SET "info_confidential" = "info", "info" = NULL
      WHERE "type" = 'accompanying'
        AND btrim(coalesce("info", '')) <> ''
        AND btrim(coalesce("info_confidential", '')) = ''
    `);
    await queryRunner.query(`
      UPDATE "opportunity"
      SET "info" = NULL
      WHERE "type" = 'accompanying'
        AND "info" IS NOT NULL
        AND (btrim("info") = '' OR btrim("info") = btrim("info_confidential"))
    `);

    const differing: { id: number }[] = await queryRunner.query(`
      SELECT "id" FROM "opportunity"
      WHERE "type" = 'accompanying' AND "info" IS NOT NULL
      ORDER BY "id"
    `);
    if (differing.length) {
      console.warn(
        `MoveAccompanyingInfoToConfidential: ${differing.length} accompanying opportunity(ies) keep a differing info, review them:`,
        differing.map((row) => row.id),
      );
    }
  }

  public async down(): Promise<void> {}
}
