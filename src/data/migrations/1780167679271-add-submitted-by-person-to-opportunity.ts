import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSubmittedByPersonToOpportunity1780167679271
  implements MigrationInterface
{
  name = "AddSubmittedByPersonToOpportunity1780167679271";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "opportunity" ADD "submitted_by_person_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ADD CONSTRAINT "FK_4f3dd494438470c347902f276d7" FOREIGN KEY ("submitted_by_person_id") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "opportunity" DROP CONSTRAINT "FK_4f3dd494438470c347902f276d7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" DROP COLUMN "submitted_by_person_id"`,
    );
  }
}
