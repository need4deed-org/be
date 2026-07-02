import { MigrationInterface, QueryRunner } from "typeorm";

// One-shot data migration: walk Opportunity rows that still carry a legacy
// rac_* Comment blob (text shaped as `email<|>full_name<|>address<|>plz<|>phone`,
// userId 1, entityType 'opportunity'), parse the blob, and populate
// Opportunity.submitted_by_person_id (#589). The Comment row is left in place.
//
// Idempotent: only touches opportunities whose submitted_by_person_id is null.
// Reversible: down() nulls the column on opportunities that still have a
// blob comment, preserving FKs set by the runtime handler on post-backfill
// submissions. Person / AgentPerson rows possibly created by up() are kept
// (they can't be reliably identified after the fact and are safe to retain).
//
// Self-contained: raw SQL only — no entities, app helpers, or SDK enums — so it
// stays pinned to the schema/contract as it was here and can't break on a fresh
// replay when those evolve (e.g. the later agent_person.status column, or an SDK
// enum value change).

interface BlobRow {
  opportunity_id: number;
  agent_id: number | null;
  blob: string;
}

// Mirror of getNameFields (first token -> firstName, last -> lastName, the rest
// -> middleName). Inlined so the migration doesn't import app code. Caller trims.
function splitName(raw: string): {
  firstName?: string;
  middleName?: string;
  lastName?: string;
} {
  const names = raw.split(" ");
  const firstName = names.shift() || undefined;
  const lastName = names.pop() || undefined;
  const middleName = names.join(" ") || undefined;
  return { firstName, middleName, lastName };
}

export class BackfillOpportunitySubmittedByPerson1780169787517
  implements MigrationInterface
{
  name = "BackfillOpportunitySubmittedByPerson1780169787517";

  // Find-or-create the submitter Person by email, refreshing name/phone from
  // this submission (only fields actually provided). Raw SQL — no Person entity.
  // createdAt/updatedAt/preferredCommunicationType have DB defaults, so omitting
  // them matches what the entity save did.
  private async resolveSubmitterPersonId(
    queryRunner: QueryRunner,
    email: string,
    fullName: string,
    phone: string,
  ): Promise<{ id: number; preExisting: boolean }> {
    const [existing] = await queryRunner.query(
      `SELECT id FROM person WHERE email ILIKE $1 LIMIT 1`,
      [email],
    );

    if (existing) {
      const sets: string[] = [];
      const params: unknown[] = [];
      if (fullName) {
        const { firstName, middleName, lastName } = splitName(fullName);
        params.push(firstName || email.split("@")[0] || "unknown");
        sets.push(`first_name = $${params.length}`);
        // null (not undefined) so absent parts clear stale middle/last names.
        params.push(middleName ?? null);
        sets.push(`middle_name = $${params.length}`);
        params.push(lastName ?? null);
        sets.push(`last_name = $${params.length}`);
      }
      if (phone) {
        params.push(phone);
        sets.push(`phone = $${params.length}`);
      }
      if (sets.length) {
        params.push(existing.id);
        await queryRunner.query(
          `UPDATE person SET ${sets.join(", ")} WHERE id = $${params.length}`,
          params,
        );
      }
      return { id: existing.id, preExisting: true };
    }

    const { firstName, middleName, lastName } = splitName(fullName);
    const [created] = await queryRunner.query(
      `INSERT INTO person (first_name, middle_name, last_name, email, phone)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        firstName || email.split("@")[0] || "unknown",
        middleName ?? null,
        lastName ?? null,
        email,
        phone || null,
      ],
    );
    return { id: created.id, preExisting: false };
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [alreadySet]: [{ count: string }] = await queryRunner.query(
      `SELECT COUNT(*)::text AS count FROM opportunity WHERE submitted_by_person_id IS NOT NULL`,
    );

    const rows: BlobRow[] = await queryRunner.query(`
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

        const email = (rac_email ?? "").trim();
        if (!email) {
          counts.skippedNoEmail++;
          console.warn(`[backfill] opp ${oppId}: empty rac_email; skipping`);
          continue;
        }

        const { id: personId, preExisting } =
          await this.resolveSubmitterPersonId(
            queryRunner,
            email,
            (rac_full_name ?? "").trim(),
            (rac_phone ?? "").trim(),
          );

        // Pre-existing (agent, person) link? Stats only.
        const preExistingLink =
          preExisting &&
          (
            await queryRunner.query(
              `SELECT 1 FROM agent_person WHERE agent_id = $1 AND person_id = $2 LIMIT 1`,
              [row.agent_id, personId],
            )
          ).length > 0;

        await queryRunner.query(
          `UPDATE opportunity SET submitted_by_person_id = $1 WHERE id = $2 AND submitted_by_person_id IS NULL`,
          [personId, oppId],
        );

        // Upsert the agent_person link. 'volunteer-coordinator' is the
        // AgentRoleType value at this migration; hardcoded so a later enum change
        // can't alter what this historical migration writes.
        await queryRunner.query(
          `INSERT INTO agent_person (agent_id, person_id, role)
           SELECT $1, $2, 'volunteer-coordinator'
           WHERE NOT EXISTS (
             SELECT 1 FROM agent_person WHERE agent_id = $1 AND person_id = $2
           )`,
          [row.agent_id, personId],
        );

        if (preExisting && preExistingLink) {
          counts.foundLinked++;
        } else if (preExisting) {
          counts.foundNoLink++;
        } else {
          counts.created++;
        }
      }
    } finally {
      console.warn("[backfill] summary:", JSON.stringify(counts));
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
