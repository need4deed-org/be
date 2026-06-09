import { ILike, MigrationInterface, QueryRunner } from "typeorm";
import { getOrCreateSubmitterPerson } from "../../server/utils/data/get-or-create-submitter-person";
import AgentPerson from "../entity/m2m/agent-person";
import Person from "../entity/person.entity";

// Follow-up to #590 (see #597): the original backfill matched only the
// 5-field blob shape (`email<|>name<|>address<|>plz<|>phone`, 4 separators),
// missing the dominant historical 4-field shape (`email<|>name<|>address<|>plz`,
// 3 separators). 29 of 30 dev-DB blob comments fell into the latter group.
//
// This migration re-runs the same resolution against the broader set
// (3 OR 4 separators). Rows already populated by #590 (or by the runtime
// handler) are filtered out at the WHERE level, so this is idempotent and
// won't re-touch them. The destructure `[email, name, , , phone] = parts`
// already handles both shapes — `phone` falls out as `undefined` for 4-field
// blobs, which getOrCreateSubmitterPerson treats correctly.

interface BlobRow {
  opportunity_id: number;
  agent_id: number | null;
  blob: string;
}

export class BackfillOpportunitySubmittedByPerson4FieldBlobs1780182685021
  implements MigrationInterface
{
  name = "BackfillOpportunitySubmittedByPerson4FieldBlobs1780182685021";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const manager = queryRunner.manager;

    const [alreadySet]: [{ count: string }] = await manager.query(
      `SELECT COUNT(*)::text AS count FROM opportunity WHERE submitted_by_person_id IS NOT NULL`,
    );

    const rows: BlobRow[] = await manager.query(`
      SELECT DISTINCT ON (o.id)
        o.id AS opportunity_id,
        o.agent_id AS agent_id,
        c.text AS blob
      FROM opportunity o
      JOIN comment c
        ON c.entity_type = 'opportunity'
       AND c.entity_id = o.id
       AND c.user_id = 1
       AND c.text ~ '^[^|]*(<\\|>[^|]*){3,4}$'
      WHERE o.submitted_by_person_id IS NULL
      ORDER BY o.id, c.created_at ASC
    `);

    const counts = {
      alreadySet: Number(alreadySet?.count ?? 0),
      eligible: rows.length,
      foundLinked: 0,
      foundNoLink: 0,
      created: 0,
      skippedNoEmail: 0,
      skippedNoAgent: 0,
    };

    try {
      for (const row of rows) {
        const oppId = row.opportunity_id;
        if (!row.agent_id) {
          counts.skippedNoAgent++;
          console.warn(`[backfill-4f] opp ${oppId}: no agent_id; skipping`);
          continue;
        }

        const parts = row.blob.split("<|>");
        const [rac_email, rac_full_name, , , rac_phone] = parts;

        if (!rac_email?.trim()) {
          counts.skippedNoEmail++;
          console.warn(`[backfill-4f] opp ${oppId}: empty rac_email; skipping`);
          continue;
        }

        const preExistingPerson = await manager.findOne(Person, {
          where: { email: ILike(rac_email.trim()) },
        });
        const preExistingLink = preExistingPerson
          ? await manager.findOne(AgentPerson, {
              where: { agentId: row.agent_id, personId: preExistingPerson.id },
            })
          : null;

        const person = await getOrCreateSubmitterPerson(
          { rac_email, rac_full_name, rac_phone },
          row.agent_id,
          manager,
        );
        if (!person) {continue;}

        await manager.query(
          `UPDATE opportunity SET submitted_by_person_id = $1 WHERE id = $2 AND submitted_by_person_id IS NULL`,
          [person.id, oppId],
        );

        if (preExistingPerson && preExistingLink) {
          counts.foundLinked++;
        } else if (preExistingPerson) {
          counts.foundNoLink++;
        } else {
          counts.created++;
        }
      }
    } finally {
      console.log("[backfill-4f] summary:", JSON.stringify(counts));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Narrow to opportunities that still have a blob comment matching this
    // migration's regex. Doesn't perfectly undo (a runtime-set FK on a row
    // that coincidentally also has a blob would still get nulled), but
    // preserves FKs on rows the runtime handler set on submissions without
    // a comment blob.
    await queryRunner.query(`
      UPDATE opportunity o
      SET submitted_by_person_id = NULL
      WHERE submitted_by_person_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM comment c
          WHERE c.entity_type = 'opportunity'
            AND c.entity_id = o.id
            AND c.user_id = 1
            AND c.text ~ '^[^|]*(<\\|>[^|]*){3,4}$'
        )
    `);
  }
}
