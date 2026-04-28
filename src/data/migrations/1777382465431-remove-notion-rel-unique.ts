import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveNotionRelUnique1777382465431 implements MigrationInterface {
  name = "RemoveNotionRelUnique1777382465431";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notion_relation" DROP CONSTRAINT "UQ_b92d4ef7fbe3be587f500d38326"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notion_relation" ADD CONSTRAINT "UQ_b92d4ef7fbe3be587f500d38326" UNIQUE ("host_nid", "tenant_nid")`,
    );
  }
}
