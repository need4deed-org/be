import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOpportunityAddress1794071300168 implements MigrationInterface {
  name = "AddOpportunityAddress1794071300168";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "opportunity" ADD "address_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ADD CONSTRAINT "FK_b6d913d56ae002810656db58507" FOREIGN KEY ("address_id") REFERENCES "address"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "opportunity" DROP CONSTRAINT "FK_b6d913d56ae002810656db58507"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" DROP COLUMN "address_id"`,
    );
  }
}
