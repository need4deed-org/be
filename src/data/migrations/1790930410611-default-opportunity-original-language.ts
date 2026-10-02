import { MigrationInterface, QueryRunner } from "typeorm";

// be#1068: opportunities written before be#1066 have no original language.
// Their text was entered in German, which is also what a NULL already
// counts as; this makes it explicit. A database without the German language
// row (before seeding) is left as it is.
//
// Raw SQL only, no entities. Not reversible: NULL and German mean the same.
export class DefaultOpportunityOriginalLanguage1790930410611
  implements MigrationInterface
{
  name = "DefaultOpportunityOriginalLanguage1790930410611";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "opportunity"
      SET "original_language_id" = "language"."id"
      FROM "language"
      WHERE "language"."iso_code" = 'de'
        AND "opportunity"."original_language_id" IS NULL
    `);
  }

  public async down(): Promise<void> {}
}
