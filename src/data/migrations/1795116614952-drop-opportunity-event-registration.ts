import { MigrationInterface, QueryRunner } from "typeorm";

export class DropOpportunityEventRegistration1795116614952
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "opportunity_event_registration"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "opportunity_event_registration" ("id" SERIAL NOT NULL, "opportunity_id" integer NOT NULL, "full_name" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying, "number_of_people" integer NOT NULL DEFAULT '1', "language_preference" character varying, "message" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_adc776ddee13969e4bdbfa0bd7f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_event_registration" ADD CONSTRAINT "FK_0b31a885b3a70883df2e2b27383" FOREIGN KEY ("opportunity_id") REFERENCES "opportunity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
