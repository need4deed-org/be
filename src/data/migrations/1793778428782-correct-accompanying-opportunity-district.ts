import { MigrationInterface, QueryRunner } from "typeorm";

// Companion data fix to be#1210. An accompanying opportunity's district is the
// appointment postcode's district, but rows switched to accompanying or with an
// edited appointment postcode kept an older district_id (often the NGO's).
// Same derivation and tie-break as getDistrictFromPostcode:
// accompanying -> postcode -> lowest district_postcode.id.
export class CorrectAccompanyingOpportunityDistrict1793778428782
  implements MigrationInterface
{
  name = "CorrectAccompanyingOpportunityDistrict1793778428782";

  // Safe to re-run: only ever updates district_id, and only where it
  // actually differs from the derived value.
  public async up(queryRunner: QueryRunner): Promise<void> {
    const corrected: { id: number; new_district_id: number }[] =
      await queryRunner.query(`
      WITH resolved AS (
        SELECT DISTINCT ON (o.id)
          o.id AS opportunity_id,
          dp.district_id AS resolved_district_id
        FROM "opportunity" o
        JOIN "accompanying" acc ON acc.id = o.accompanying_id
        JOIN "district_postcode" dp ON dp.postcode_id = acc.postcode_id
        WHERE o.type = 'accompanying'
        ORDER BY o.id, dp.id ASC
      )
      UPDATE "opportunity"
      SET district_id = resolved.resolved_district_id
      FROM resolved
      WHERE "opportunity".id = resolved.opportunity_id
        AND "opportunity".district_id IS DISTINCT FROM resolved.resolved_district_id
      RETURNING "opportunity".id, resolved.resolved_district_id AS new_district_id;
    `);

    if (corrected.length > 0) {
      console.warn(
        `CorrectAccompanyingOpportunityDistrict: corrected district for ${corrected.length} opportunit(y/ies):`,
        corrected.map((row) => row.id),
      );
    }
  }

  // Prior district_id values aren't recorded, so no automatic rollback —
  // same as RecorrectAgentDistrictFromPostcode1790768886772.
  public async down(): Promise<void> {}
}
