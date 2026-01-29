import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncAndUpdateOppVolM2m1769606450859 implements MigrationInterface {
  name = "SyncAndUpdateOppVolM2m1769606450859";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );

    await queryRunner.query(
      `ALTER TYPE "opportunity_volunteer_status_enum" ADD VALUE 'pending'`,
    );

    await queryRunner.query(
      `UPDATE "opportunity_volunteer" SET "status" = 'pending' WHERE "status" = 'suggested'`,
    );

    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" ALTER COLUMN "status" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" ALTER COLUMN "status" DROP NOT NULL`,
    );

    await queryRunner.query(
      `UPDATE "opportunity_volunteer" SET "status" = 'suggested' WHERE "status" = 'pending'`,
    );

    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" DROP COLUMN "created_at"`,
    );
  }
}
