import { MigrationInterface, QueryRunner } from "typeorm";

// One-shot data migration for be#833: freeze contact_person_id on every
// opportunity that doesn't have one yet, so it stops being recomputed live.
//
// Bug: getOpportunityContact (src/services/dto/dto-opportunity.ts) falls back,
// on every read, to the opportunity's agent's *current* representative
// whenever contact_person_id is null. Historically almost no creation path
// set contact_person_id (only the legacy public form does), so most
// opportunities depend on that live fallback — meaning adding a brand new
// contact to an agent (especially its first, or one marked
// volunteer-coordinator) instantly changes the displayed/emailed contact for
// every one of that agent's pre-existing opportunities.
//
// This migration snapshots today's resolution for each affected row so it
// stops drifting: the submitter, if they're currently a member of the
// opportunity's agent; else the agent's volunteer-coordinator; else the
// agent's earliest-registered contact (mirroring Agent.representative,
// src/data/entity/opportunity/agent.entity.ts:121-129, which has no
// deterministic ordering of its own, so "earliest by id" approximates its
// typical unordered-query result). This does NOT correct any opportunity
// that is already showing a wrong contact today — that still requires the
// existing manual relink tool (be#824, PATCH /opportunity/:id contact.id) —
// it only stops today's value from being disturbed by future contact changes.
//
// Idempotent: only touches opportunities whose contact_person_id is null.
// Self-contained: raw SQL only, no entities/app helpers/SDK enums.
// 'volunteer-coordinator' is the AgentRoleType.VOLUNTEER_COORDINATOR value at
// this migration; hardcoded so a later enum rename can't alter what this
// historical migration reads.
export class BackfillOpportunityContactPerson1786096580655
  implements MigrationInterface
{
  name = "BackfillOpportunityContactPerson1786096580655";

  private static readonly RESOLVED_CONTACT_SQL = `
    COALESCE(
      (
        SELECT o.submitted_by_person_id
        WHERE o.submitted_by_person_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM agent_person ap
            WHERE ap.agent_id = o.agent_id
              AND ap.person_id = o.submitted_by_person_id
          )
      ),
      (
        SELECT ap.person_id FROM agent_person ap
        WHERE ap.agent_id = o.agent_id AND ap.role = 'volunteer-coordinator'
        ORDER BY ap.id ASC LIMIT 1
      ),
      (
        SELECT ap.person_id FROM agent_person ap
        WHERE ap.agent_id = o.agent_id
        ORDER BY ap.id ASC LIMIT 1
      )
    )
  `;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const result = await queryRunner.query(`
      UPDATE opportunity o
      SET contact_person_id = ${BackfillOpportunityContactPerson1786096580655.RESOLVED_CONTACT_SQL}
      WHERE o.contact_person_id IS NULL
        AND o.agent_id IS NOT NULL
    `);
    console.warn(
      `[backfill-opportunity-contact-person] updated ${result[1] ?? "unknown"} row(s)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Narrow the reversal to opportunities whose current contact_person_id
    // still equals what up()'s resolution would produce today. A row that
    // up() left untouched (already had a stored contact from the legacy
    // route or a manual relink) is only nulled here if it happens to
    // coincidentally match that formula. Not perfectly correct, but much
    // closer to "undo what up() did" than a blanket UPDATE (same tradeoff as
    // 1780169787517-backfill-opportunity-submitted-by-person.ts).
    await queryRunner.query(`
      UPDATE opportunity o
      SET contact_person_id = NULL
      WHERE o.agent_id IS NOT NULL
        AND o.contact_person_id = ${BackfillOpportunityContactPerson1786096580655.RESOLVED_CONTACT_SQL}
    `);
  }
}
