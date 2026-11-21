import { MigrationInterface, QueryRunner } from "typeorm";

export class EventSignUpQuestion1795196344313 implements MigrationInterface {
  name = "EventSignUpQuestion1795196344313";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_n4d_registration" DROP COLUMN "phone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_n4d_registration" DROP COLUMN "language_preference"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_n4d" ADD "sign_up_question" character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_n4d_registration" ADD "sign_up_answer" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_n4d_registration" DROP COLUMN "sign_up_answer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_n4d" DROP COLUMN "sign_up_question"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_n4d_registration" ADD "language_preference" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_n4d_registration" ADD "phone" character varying`,
    );
  }
}
