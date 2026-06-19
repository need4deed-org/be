import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueDealActivity1780487570188 implements MigrationInterface {
  name = "AddUniqueDealActivity1780487570188";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Defensively drop any duplicate (deal_id, activity_id) rows the backfill
    // may have produced before enforcing uniqueness, keeping the lowest id.
    await queryRunner.query(
      `DELETE FROM "deal_activity" a USING "deal_activity" b WHERE a.id > b.id AND a.deal_id = b.deal_id AND a.activity_id = b.activity_id`,
    );
    await queryRunner.query(
      `ALTER TABLE "deal_activity" ADD CONSTRAINT "UQ_916f710fb2164dee243ab81e42d" UNIQUE ("deal_id", "activity_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "deal_activity" DROP CONSTRAINT "UQ_916f710fb2164dee243ab81e42d"`,
    );
  }
}
