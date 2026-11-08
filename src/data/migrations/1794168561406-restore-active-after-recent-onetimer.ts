import { MigrationInterface, QueryRunner } from "typeorm";

export class RestoreActiveAfterRecentOnetimer1794168561406
  implements MigrationInterface
{
  name = "RestoreActiveAfterRecentOnetimer1794168561406";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const restored: { id: number }[] = await queryRunner.query(`
      WITH restored AS (
        UPDATE "volunteer" v
        SET status_engagement = 'vol-active'
        WHERE v.status_engagement = 'vol-available'
          AND EXISTS (
            SELECT 1 FROM "opportunity_volunteer" ov
            JOIN "opportunity" o ON o.id = ov.opportunity_id
            JOIN "onetimer" ot ON ot.id = o.onetimer_id
            WHERE ov.volunteer_id = v.id
              AND ov.status = 'opp-past'
              AND o.type IN ('accompanying', 'events')
              AND ot.date >= (date_trunc('day', now() AT TIME ZONE 'Europe/Berlin') - interval '28 days') AT TIME ZONE 'Europe/Berlin'
          )
          AND (
            SELECT al.actor_user_id IS NULL
              AND al.detail = 'Status changed from vol-active to vol-available.'
            FROM "volunteer_audit_log" al
            WHERE al.volunteer_id = v.id AND al.type = 'availability_changed'
            ORDER BY al.occurred_at DESC, al.id DESC
            LIMIT 1
          )
        RETURNING v.id
      ),
      logged AS (
        INSERT INTO "volunteer_audit_log" (volunteer_id, type, detail, occurred_at)
        SELECT id, 'availability_changed', 'Status changed from vol-available to vol-active.', now()
        FROM restored
      )
      SELECT id FROM restored;
    `);

    if (restored.length > 0) {
      console.warn(
        `RestoreActiveAfterRecentOnetimer: set ${restored.length} volunteer(s) back to Active:`,
        restored.map(({ id }) => id),
      );
    }
  }

  public async down(): Promise<void> {}
}
