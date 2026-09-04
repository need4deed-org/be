import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostReplyParentFields1788427042785
  implements MigrationInterface
{
  name = "AddPostReplyParentFields1788427042785";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "post" ADD "parent_id" integer`);
    await queryRunner.query(`ALTER TABLE "post" ADD "root_id" integer`);
    await queryRunner.query(
      `ALTER TABLE "post" ADD CONSTRAINT "FK_502b5d7b881d2474c56195acb83" FOREIGN KEY ("parent_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "post" ADD CONSTRAINT "FK_29c253423b151a791f58f0e9889" FOREIGN KEY ("root_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "post" DROP CONSTRAINT "FK_29c253423b151a791f58f0e9889"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post" DROP CONSTRAINT "FK_502b5d7b881d2474c56195acb83"`,
    );
    await queryRunner.query(`ALTER TABLE "post" DROP COLUMN "root_id"`);
    await queryRunner.query(`ALTER TABLE "post" DROP COLUMN "parent_id"`);
  }
}
