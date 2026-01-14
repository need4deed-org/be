import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAppreciationEntity1768432032022 implements MigrationInterface {
  name = "AddAppreciationEntity1768432032022";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "preferred_communication_type" SET DEFAULT ARRAY['mobilePhone']`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" DROP CONSTRAINT "FK_2a91e0b949799349a3a87aa220b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" ALTER COLUMN "volunteer_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" ADD CONSTRAINT "FK_2a91e0b949799349a3a87aa220b" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "appreciation" DROP CONSTRAINT "FK_2a91e0b949799349a3a87aa220b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" ALTER COLUMN "volunteer_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" ADD CONSTRAINT "FK_2a91e0b949799349a3a87aa220b" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "preferred_communication_type" SET DEFAULT ARRAY['mobilePhone']`,
    );
  }
}
