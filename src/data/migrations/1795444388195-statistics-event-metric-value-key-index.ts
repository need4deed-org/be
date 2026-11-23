import { MigrationInterface, QueryRunner } from "typeorm";

export class StatisticsEventMetricValueKeyIndex1795444388195
  implements MigrationInterface
{
  name = "StatisticsEventMetricValueKeyIndex1795444388195";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_2b82a632f80c7de4e090d93c87" ON "statistics_event" ("metric", "value_key") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2b82a632f80c7de4e090d93c87"`,
    );
  }
}
