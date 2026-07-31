import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVolunteerAppreciationOptions1785445240609
  implements MigrationInterface
{
  name = "AddVolunteerAppreciationOptions1785445240609";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."appreciation_title_enum" RENAME TO "appreciation_title_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."appreciation_title_enum" AS ENUM('t-shirt', 'benefit-card', 'tote-bag', 'need4deed-certificate', 'cap', 'notebook', 'city-certificate')`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" ALTER COLUMN "title" TYPE "public"."appreciation_title_enum" USING "title"::"text"::"public"."appreciation_title_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."appreciation_title_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."volunteer_status_appreciation_enum" RENAME TO "volunteer_status_appreciation_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_appreciation_enum" AS ENUM('t-shirt', 'benefit-card', 'tote-bag', 'need4deed-certificate', 'cap', 'notebook', 'city-certificate')`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_appreciation" TYPE "public"."volunteer_status_appreciation_enum" USING "status_appreciation"::"text"::"public"."volunteer_status_appreciation_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."volunteer_status_appreciation_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_appreciation_enum_old" AS ENUM('benefit-card', 't-shirt', 'tote-bag')`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_appreciation" TYPE "public"."volunteer_status_appreciation_enum_old" USING "status_appreciation"::"text"::"public"."volunteer_status_appreciation_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."volunteer_status_appreciation_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."volunteer_status_appreciation_enum_old" RENAME TO "volunteer_status_appreciation_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."appreciation_title_enum_old" AS ENUM('benefit-card', 't-shirt', 'tote-bag')`,
    );
    await queryRunner.query(
      `ALTER TABLE "appreciation" ALTER COLUMN "title" TYPE "public"."appreciation_title_enum_old" USING "title"::"text"::"public"."appreciation_title_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."appreciation_title_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."appreciation_title_enum_old" RENAME TO "appreciation_title_enum"`,
    );
  }
}
