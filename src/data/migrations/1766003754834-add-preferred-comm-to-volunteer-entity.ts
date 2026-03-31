import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPreferredCommToVolunteerEntity1766003754834
  implements MigrationInterface
{
  name = "AddPreferredCommToVolunteerEntity1766003754834";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event_translation" DROP CONSTRAINT "FK_42df355dff4a2dd4edeb6f9fc66"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."opportunity_volunteer_status_enum" AS ENUM('suggested', 'matched', 'active', 'past')`,
    );
    await queryRunner.query(
      `CREATE TABLE "opportunity_volunteer" ("id" SERIAL NOT NULL, "status" "public"."opportunity_volunteer_status_enum", "opportunity_id" integer NOT NULL, "volunteer_id" integer NOT NULL, CONSTRAINT "PK_501d2e5de509fa64503be23ae18" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_preferred_communication_type_enum" AS ENUM('email', 'mobilePhone', 'whatsapp', 'telegram')`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ADD "preferred_communication_type" "public"."volunteer_preferred_communication_type_enum" NOT NULL DEFAULT 'mobilePhone'`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_translation" ADD CONSTRAINT "FK_42df355dff4a2dd4edeb6f9fc66" FOREIGN KEY ("eventn4d_id") REFERENCES "event_n4d"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" ADD CONSTRAINT "FK_4a47cea224192a18c9bb93c07b4" FOREIGN KEY ("opportunity_id") REFERENCES "opportunity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" ADD CONSTRAINT "FK_c0f508b980be4be0b244a5471a1" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" DROP CONSTRAINT "FK_c0f508b980be4be0b244a5471a1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" DROP CONSTRAINT "FK_4a47cea224192a18c9bb93c07b4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_translation" DROP CONSTRAINT "FK_42df355dff4a2dd4edeb6f9fc66"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" DROP COLUMN "preferred_communication_type"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."volunteer_preferred_communication_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "opportunity_volunteer"`);
    await queryRunner.query(
      `DROP TYPE "public"."opportunity_volunteer_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_translation" ADD CONSTRAINT "FK_42df355dff4a2dd4edeb6f9fc66" FOREIGN KEY ("eventn4d_id") REFERENCES "event_n4d"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
