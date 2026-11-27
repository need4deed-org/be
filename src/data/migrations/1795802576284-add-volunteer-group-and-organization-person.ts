import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVolunteerGroupAndOrganizationPerson1795802576284
  implements MigrationInterface
{
  name = "AddVolunteerGroupAndOrganizationPerson1795802576284";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."organization_person_role_enum" AS ENUM('social-worker', 'volunteer-coordinator', 'manager', 'project-coordinator', 'psychologist', 'project-staff', 'childcare-worker', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organization_person_status_enum" AS ENUM('active', 'pending')`,
    );
    await queryRunner.query(
      `CREATE TABLE "organization_person" ("id" SERIAL NOT NULL, "role" "public"."organization_person_role_enum" NOT NULL DEFAULT 'other', "status" "public"."organization_person_status_enum" NOT NULL DEFAULT 'active', "organization_id" integer NOT NULL, "person_id" integer NOT NULL, CONSTRAINT "PK_e94553ff34338a3882ed305a74d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7485185b5cbc68c8af9128638e" ON "organization_person" ("organization_id", "person_id", "role") `,
    );
    await queryRunner.query(
      `CREATE TABLE "volunteer_group" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "organization_id" integer, "agent_id" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_853fb2333276b2e28a924471e6d" UNIQUE ("organization_id"), CONSTRAINT "UQ_1a44c6d67cff676ac34485030a5" UNIQUE ("agent_id"), CONSTRAINT "CHK_7ebac8712680f0153a05f943b6" CHECK (("organization_id" IS NULL) <> ("agent_id" IS NULL)), CONSTRAINT "PK_92fadf1aaeac1074ac591ba5d56" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_person" ADD CONSTRAINT "FK_fcbf923cbee734049476169039e" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_person" ADD CONSTRAINT "FK_376060736c7778255d21a950d07" FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer_group" ADD CONSTRAINT "FK_853fb2333276b2e28a924471e6d" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer_group" ADD CONSTRAINT "FK_1a44c6d67cff676ac34485030a5" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "volunteer_group" DROP CONSTRAINT "FK_1a44c6d67cff676ac34485030a5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer_group" DROP CONSTRAINT "FK_853fb2333276b2e28a924471e6d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_person" DROP CONSTRAINT "FK_376060736c7778255d21a950d07"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_person" DROP CONSTRAINT "FK_fcbf923cbee734049476169039e"`,
    );
    await queryRunner.query(`DROP TABLE "volunteer_group"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7485185b5cbc68c8af9128638e"`,
    );
    await queryRunner.query(`DROP TABLE "organization_person"`);
    await queryRunner.query(
      `DROP TYPE "public"."organization_person_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."organization_person_role_enum"`,
    );
  }
}
