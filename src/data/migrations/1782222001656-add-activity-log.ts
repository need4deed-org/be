import { MigrationInterface, QueryRunner } from "typeorm";

export class AddActivityLog1782222001656 implements MigrationInterface {
  name = "AddActivityLog1782222001656";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "opportunity" DROP CONSTRAINT "opportunity_contact_person_id_fkey"`,
    );
    await queryRunner.query(
      `CREATE TABLE "activity_log" ("id" SERIAL NOT NULL, "date" date NOT NULL, "hours" numeric(5,2) NOT NULL, "opportunity_volunteer_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_067d761e2956b77b14e534fd6f1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_log" ADD CONSTRAINT "FK_7f5f4c33b2fbdc19b1f8460b5f0" FOREIGN KEY ("opportunity_volunteer_id") REFERENCES "opportunity_volunteer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ADD CONSTRAINT "FK_dad52d4b309d2e04b9663fbb36d" FOREIGN KEY ("contact_person_id") REFERENCES "person"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "opportunity" DROP CONSTRAINT "FK_dad52d4b309d2e04b9663fbb36d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_log" DROP CONSTRAINT "FK_7f5f4c33b2fbdc19b1f8460b5f0"`,
    );
    await queryRunner.query(`DROP TABLE "activity_log"`);
    await queryRunner.query(
      `ALTER TABLE "opportunity" ADD CONSTRAINT "opportunity_contact_person_id_fkey" FOREIGN KEY ("contact_person_id") REFERENCES "person"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
