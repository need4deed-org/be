import { ILike, MigrationInterface, QueryRunner } from "typeorm";
import { getOrCreateSubmitterPerson } from "../../server/utils/data/get-or-create-submitter-person";
import AgentPerson from "../entity/m2m/agent-person";
import Person from "../entity/person.entity";

// One-shot data migration: walk Opportunity rows that still carry a legacy
// rac_* Comment blob (text shaped as `email<|>full_name<|>address<|>plz<|>phone`,
// userId 1, entityType 'opportunity'), parse the blob, and populate
// Opportunity.submitted_by_person_id via the same getOrCreateSubmitterPerson
// helper the runtime handler uses (#589). The Comment row is left in place.
//
// Idempotent: only touches opportunities whose submitted_by_person_id is null.
// Reversible: down() nulls the column on opportunities that still have a
// blob comment, preserving FKs set by the runtime handler on post-backfill
// submissions. Person / AgentPerson rows possibly created by up() are kept
// (they can't be reliably identified after the fact and are safe to retain).

interface BlobRow {
  opportunity_id: number;
  agent_id: number | null;
  blob: string;
}

export class BackfillOpportunitySubmittedByPerson1780169787517
  implements MigrationInterface
{
  name = "BackfillOpportunitySubmittedByPerson1780169787517";

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
       AND c.text ~ '^[^|]*(<\\|>[^|]*){4}$'
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
          console.warn(`[backfill] opp ${oppId}: no agent_id; skipping`);
          continue;
        }

        const parts = row.blob.split("<|>");
        const [rac_email, rac_full_name, , , rac_phone] = parts;

        if (!rac_email?.trim()) {
          counts.skippedNoEmail++;
          console.warn(`[backfill] opp ${oppId}: empty rac_email; skipping`);
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
        // helper only returns null when rac_email is empty, which the
        // explicit check above already short-circuits, so this is safe.
        if (!person) {
          continue;
        }

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
      console.log("[backfill] summary:", JSON.stringify(counts));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Narrow the reversal to opportunities that still have a blob comment —
    // the same set up() considered. A row that was populated only by the
    // runtime handler (#589) won't match, so its FK is preserved. Not
    // perfectly correct (a runtime-set FK on a row that coincidentally also
    // has a blob comment would still get nulled), but much closer to "undo
    // what up() did" than a blanket UPDATE.
    await queryRunner.query(`
      UPDATE opportunity o
      SET submitted_by_person_id = NULL
      WHERE submitted_by_person_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM comment c
          WHERE c.entity_type = 'opportunity'
            AND c.entity_id = o.id
            AND c.user_id = 1
            AND c.text ~ '^[^|]*(<\\|>[^|]*){4}$'
        )
    `);
  }
}
