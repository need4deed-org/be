import { MigrationInterface, QueryRunner } from "typeorm";
import { linkAgentToDomainOrganization } from "../../server/utils/data/link-agent-organization";

export class LinkAgentsToDomainOrganizations1795118204507
  implements MigrationInterface
{
  name = "LinkAgentsToDomainOrganizations1795118204507";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const agents: { id: number }[] = await queryRunner.query(
      `SELECT "id" FROM "agent" WHERE "organization_id" IS NULL ORDER BY "id"`,
    );
    let linked = 0;
    for (const { id } of agents) {
      if (await linkAgentToDomainOrganization(queryRunner, id)) {
        linked += 1;
      }
    }
    console.warn(
      `[link-agents-to-domain-organizations] linked ${linked}, skipped ${agents.length - linked} of ${agents.length} unlinked agent(s)`,
    );
  }

  public async down(): Promise<void> {}
}
