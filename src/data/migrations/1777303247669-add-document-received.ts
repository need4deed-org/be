import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDocumentReceived1777303247669 implements MigrationInterface {
  name = "AddDocumentReceived1777303247669";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "document"
      ADD COLUMN IF NOT EXISTS "received" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "received_on" timestamp
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "document" DROP COLUMN IF EXISTS "received_on"`);
    await queryRunner.query(`ALTER TABLE "document" DROP COLUMN IF EXISTS "received"`);
  }
}
