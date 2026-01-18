import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAppreciationEntity1768772092135 implements MigrationInterface {
  name = "AddAppreciationEntity1768772092135";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."appreciation_title_enum" AS ENUM('t-shirt', 'benefit-card', 'tote-bag')`,
    );
    await queryRunner.query(
      `CREATE TABLE "appreciation" ("id" SERIAL NOT NULL, "title" "public"."appreciation_title_enum" NOT NULL, "date_due" TIMESTAMP, "date_delivery" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "opportunity_id" integer, "volunteer_id" integer NOT NULL, "user_id" integer, CONSTRAINT "PK_d9824c8e198e82f7394c805eddf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "preferred_communication_type" SET DEFAULT ARRAY['mobilePhone']`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" ADD CONSTRAINT "FK_ce5266cf486c563f4e2c8babe4c" FOREIGN KEY ("opportunity_id") REFERENCES "opportunity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" ADD CONSTRAINT "FK_2a91e0b949799349a3a87aa220b" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" ADD CONSTRAINT "FK_29ae22414bad9bb74367b329b00" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "appreciation" DROP CONSTRAINT "FK_29ae22414bad9bb74367b329b00"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" DROP CONSTRAINT "FK_2a91e0b949799349a3a87aa220b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" DROP CONSTRAINT "FK_ce5266cf486c563f4e2c8babe4c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "preferred_communication_type" SET DEFAULT ARRAY['mobilePhone']`,
    );
    await queryRunner.query(`DROP TABLE "appreciation"`);
    await queryRunner.query(`DROP TYPE "public"."appreciation_title_enum"`);
  }
}
