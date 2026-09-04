import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostReplyIndexAndCheck1788430258732
  implements MigrationInterface
{
  name = "AddPostReplyIndexAndCheck1788430258732";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_502b5d7b881d2474c56195acb8" ON "post" ("parent_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_29c253423b151a791f58f0e988" ON "post" ("root_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "post" ADD CONSTRAINT "CHK_ab670e5b6592a9ebe006e009a6" CHECK (("parent_id" IS NULL) = ("root_id" IS NULL))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "post" DROP CONSTRAINT "CHK_ab670e5b6592a9ebe006e009a6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_29c253423b151a791f58f0e988"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_502b5d7b881d2474c56195acb8"`,
    );
  }
}
