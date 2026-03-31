import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotionRelationEntity1774135672526
  implements MigrationInterface
{
  name = "AddNotionRelationEntity1774135672526";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."notion_relation_host_type_enum" AS ENUM('none', 'activity', 'agent', 'comment', 'category', 'district', 'language', 'lead_from', 'opportunity', 'skill', 'volunteer')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notion_relation_tenant_type_enum" AS ENUM('none', 'activity', 'agent', 'comment', 'category', 'district', 'language', 'lead_from', 'opportunity', 'skill', 'volunteer')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notion_relation" ("id" SERIAL NOT NULL, "payroll" character varying, "host_nid" character varying NOT NULL, "host_type" "public"."notion_relation_host_type_enum" NOT NULL, "host_id" integer NOT NULL, "tenant_nid" character varying NOT NULL, "tenant_type" "public"."notion_relation_tenant_type_enum" NOT NULL, "tenant_id" integer, CONSTRAINT "UQ_b92d4ef7fbe3be587f500d38326" UNIQUE ("host_nid", "tenant_nid"), CONSTRAINT "PK_a9db9fcae0b0476e5142622c0c0" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notion_relation"`);
    await queryRunner.query(
      `DROP TYPE "public"."notion_relation_tenant_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."notion_relation_host_type_enum"`,
    );
  }
}
