import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEventRegistration1786949224078 implements MigrationInterface {
  name = "AddEventRegistration1786949224078";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "event_registration" ("id" SERIAL NOT NULL, "opportunity_id" integer NOT NULL, "full_name" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying, "number_of_people" integer NOT NULL DEFAULT '1', "language_preference" character varying, "message" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_10aedff1bd0d0ef534d1106ddec" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_registration" ADD CONSTRAINT "FK_9cf53d8ebc8e1fc43378c7865d6" FOREIGN KEY ("opportunity_id") REFERENCES "opportunity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_registration" DROP CONSTRAINT "FK_9cf53d8ebc8e1fc43378c7865d6"`,
    );
    await queryRunner.query(`DROP TABLE "event_registration"`);
  }
}
