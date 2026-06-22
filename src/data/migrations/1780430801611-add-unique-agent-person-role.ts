import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueAgentPersonRole1780430801611
  implements MigrationInterface
{
  name = "AddUniqueAgentPersonRole1780430801611";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_f15c4b743ddfba08409b99f797" ON "agent_person" ("agent_id", "person_id", "role") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f15c4b743ddfba08409b99f797"`,
    );
  }
}
