import { MigrationInterface, QueryRunner } from "typeorm";

// Companion data fix to be#1059. CorrectAgentDistrictFromPostcode1785921264590
// (be#827) reconciled every agent once, but POST /agent/register and
// POST /agent kept writing a client-supplied district_id until this PR, so
// agents created since then can disagree with their postcode again. Same
// derivation and tie-break as that migration (and getDistrictFromPostcode):
// address -> postcode -> lowest district_postcode.id.
export class RecorrectAgentDistrictFromPostcode1790768886772
  implements MigrationInterface
{
  name = "RecorrectAgentDistrictFromPostcode1790768886772";

  // Safe to re-run: only ever updates district_id, and only where it
  // actually differs from the derived value.
  public async up(queryRunner: QueryRunner): Promise<void> {
    const corrected: { id: number; new_district_id: number }[] =
      await queryRunner.query(`
      WITH resolved AS (
        SELECT DISTINCT ON (a.id)
          a.id AS agent_id,
          dp.district_id AS resolved_district_id
        FROM "agent" a
        JOIN "address" addr ON addr.id = a.address_id
        JOIN "district_postcode" dp ON dp.postcode_id = addr.postcode_id
        ORDER BY a.id, dp.id ASC
      )
      UPDATE "agent"
      SET district_id = resolved.resolved_district_id
      FROM resolved
      WHERE "agent".id = resolved.agent_id
        AND "agent".district_id IS DISTINCT FROM resolved.resolved_district_id
      RETURNING "agent".id, resolved.resolved_district_id AS new_district_id;
    `);

    if (corrected.length > 0) {
      console.warn(
        `RecorrectAgentDistrictFromPostcode: corrected district for ${corrected.length} agent(s):`,
        corrected.map((row) => row.id),
      );
    }
  }

  // Prior district_id values aren't recorded, so no automatic rollback —
  // same as CorrectAgentDistrictFromPostcode1785921264590.
  public async down(): Promise<void> {}
}
