import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCommunicationEntity1767816732428 implements MigrationInterface {
  name = "AddCommunicationEntity1767816732428";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "volunteer" DROP CONSTRAINT "chk_valid_communication_types"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."communication_contact_type_enum" AS ENUM('called', 'tried-to-call', 'texted-or-emailed', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."communication_contact_method_enum" AS ENUM('email', 'phone-number', 'telegram', 'whatsapp', 'signal', 'sms', 'voicenote')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."communication_communication_type_enum" AS ENUM('briefed', 'first-inquiry-sent', 'opportunity-list-sent', 'status-update', 'post-match-followup')`,
    );
    await queryRunner.query(
      `CREATE TABLE "communication" ("id" SERIAL NOT NULL, "contact_type" "public"."communication_contact_type_enum" NOT NULL, "contact_method" "public"."communication_contact_method_enum" NOT NULL, "communication_type" "public"."communication_communication_type_enum", "date" TIMESTAMP NOT NULL, "volunteer_id" integer, "user_id" integer, CONSTRAINT "PK_392407b9e9100bee1a64e26cd5d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication" ADD CONSTRAINT "FK_fb198b1a72d3e9fa9e006c824c0" FOREIGN KEY ("volunteer_id") REFERENCES "volunteer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication" ADD CONSTRAINT "FK_3120e867d4bf41caa7b8984440e" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "communication" DROP CONSTRAINT "FK_3120e867d4bf41caa7b8984440e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "communication" DROP CONSTRAINT "FK_fb198b1a72d3e9fa9e006c824c0"`,
    );
    await queryRunner.query(`DROP TABLE "communication"`);
    await queryRunner.query(
      `DROP TYPE "public"."communication_communication_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."communication_contact_method_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."communication_contact_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ADD CONSTRAINT "chk_valid_communication_types" CHECK (validate_communication_types(preferred_communication_type))`,
    );
  }
}
