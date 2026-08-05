import { MigrationInterface, QueryRunner } from "typeorm";

// Companion data fix to the app-code change in this PR (be#827): agent.district
// was previously only ever backfilled when null (GET /agent, read-time) and
// was independently PATCH-able, so it could drift out of sync with the
// agent's actual postcode and never reconcile. This corrects existing rows
// using the same derivation the app now applies on write: join through the
// agent's address to its postcode, then to district_postcode.
//
// A postcode can map to more than one district (district_postcode is a
// genuine m2m), so DISTINCT ON picks the lowest district_postcode.id per
// agent — the same deterministic tie-break added to getDistrictFromPostcode
// in this PR, so a fresh read and this backfill can never disagree.
export class CorrectAgentDistrictFromPostcode1785921264590
  implements MigrationInterface
{
  name = "CorrectAgentDistrictFromPostcode1785921264590";

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
        `CorrectAgentDistrictFromPostcode: corrected district for ${corrected.length} agent(s):`,
        corrected.map((row) => row.id),
      );
    }
  }

  // Prior district_id values aren't recorded, so no automatic rollback —
  // same convention as the other data-correction migrations in this repo
  // (e.g. RestoreMatchDatesFromNotionCsv1785432386411).
  public async down(): Promise<void> {}
}
