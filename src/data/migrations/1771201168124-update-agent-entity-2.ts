import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAgentEntity21771201168124 implements MigrationInterface {
  name = "UpdateAgentEntity21771201168124";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent" DROP CONSTRAINT "FK_790c4a8ac360683061758eea4fb"`,
    );
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "postcode_id"`);
    await queryRunner.query(`ALTER TABLE "agent" ADD "address_id" integer`);
    await queryRunner.query(`ALTER TABLE "agent" ADD "district_id" integer`);
    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "FK_7b8b0514632bffdf8d13afbc9de" FOREIGN KEY ("address_id") REFERENCES "address"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "FK_6b58af875f81124b0cd64dc843a" FOREIGN KEY ("district_id") REFERENCES "district"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent" DROP CONSTRAINT "FK_6b58af875f81124b0cd64dc843a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" DROP CONSTRAINT "FK_7b8b0514632bffdf8d13afbc9de"`,
    );
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "district_id"`);
    await queryRunner.query(`ALTER TABLE "agent" DROP COLUMN "address_id"`);
    await queryRunner.query(`ALTER TABLE "agent" ADD "postcode_id" integer`);
    await queryRunner.query(
      `ALTER TABLE "agent" ADD CONSTRAINT "FK_790c4a8ac360683061758eea4fb" FOREIGN KEY ("postcode_id") REFERENCES "postcode"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
