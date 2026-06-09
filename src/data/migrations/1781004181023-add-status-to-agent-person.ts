import { MigrationInterface, QueryRunner } from "typeorm";

// Adds the membership status to agent_person, supporting self-registration
// joins: a join lands ACTIVE on email-domain match, otherwise PENDING until an
// ADMIN/COORDINATOR approves it. All pre-existing rows are genuine memberships,
// so they backfill to 'active' via the column default.
//
// NOTE: `migration:generate` also emitted unrelated deal/profile/location/time
// drift (the local dev DB is behind this branch's entities) — that has been
// stripped; this migration only touches agent_person.
export class AddStatusToAgentPerson1781004181023 implements MigrationInterface {
  name = "AddStatusToAgentPerson1781004181023";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."agent_person_status_enum" AS ENUM('active', 'pending')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_person" ADD "status" "public"."agent_person_status_enum" NOT NULL DEFAULT 'active'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "agent_person" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."agent_person_status_enum"`);
  }
}
