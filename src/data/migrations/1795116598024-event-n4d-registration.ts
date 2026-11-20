import { MigrationInterface, QueryRunner } from "typeorm";

export class EventN4dRegistration1795116598024 implements MigrationInterface {
  name = "EventN4dRegistration1795116598024";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "event_n4d_registration" ("id" SERIAL NOT NULL, "event_id" integer NOT NULL, "full_name" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying, "number_of_people" integer NOT NULL DEFAULT '1', "language_preference" character varying, "message" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_volunteer" boolean NOT NULL DEFAULT false, "volunteer_types" text array NOT NULL DEFAULT '{}', "volunteer_id" integer, "attended" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_1928a473aa3f9e5a288ccaf6d1c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_n4d_registration" ADD CONSTRAINT "FK_064f4dd1b2048cc936c0973e530" FOREIGN KEY ("event_id") REFERENCES "event_n4d"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_n4d_registration" ADD CONSTRAINT "FK_deb01a87081c4c7f1bcee21df01" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_n4d_registration" DROP CONSTRAINT "FK_deb01a87081c4c7f1bcee21df01"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_n4d_registration" DROP CONSTRAINT "FK_064f4dd1b2048cc936c0973e530"`,
    );
    await queryRunner.query(`DROP TABLE "event_n4d_registration"`);
  }
}
