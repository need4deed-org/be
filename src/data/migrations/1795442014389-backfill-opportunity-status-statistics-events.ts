import { MigrationInterface, QueryRunner } from "typeorm";

// Literals only, so a fresh replay doesn't depend on app code or sdk enums.
const BACKFILLS = [
  {
    metric: "past-opportunities",
    statuses: ["opp-past"],
    occurredAt: "o.updated_at",
  },
  {
    metric: "validated-opportunities",
    statuses: ["opp-searching", "opp-active", "opp-past"],
    occurredAt: "o.created_at",
  },
];

export class BackfillOpportunityStatusStatisticsEvents1795442014389
  implements MigrationInterface
{
  name = "BackfillOpportunityStatusStatisticsEvents1795442014389";

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { metric, statuses, occurredAt } of BACKFILLS) {
      await queryRunner.query(
        `INSERT INTO statistics_event
           (metric, occurred_at, value_key, district_id, opportunity_type)
         SELECT $1::varchar, ${occurredAt}, o.id::text,
           COALESCE(o.district_id, CASE WHEN o.address_id IS NULL THEN a.district_id END),
           o.type::text
         FROM opportunity o
         LEFT JOIN agent a ON a.id = o.agent_id
         WHERE o.status::text = ANY($2::text[])
           AND NOT EXISTS (
             SELECT 1 FROM statistics_event se
             WHERE se.metric = $1 AND se.value_key = o.id::text
           )`,
        [metric, statuses],
      );
    }
  }

  // Irreversible: the daily job's events can't be told apart from the backfill's.
  public async down(): Promise<void> {}
}
