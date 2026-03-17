import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateCommentEtity21773746534596 implements MigrationInterface {
  name = "UpdateCommentEtity21773746534596";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."volunteer_status_engagement_enum" RENAME TO "volunteer_status_engagement_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_engagement_enum" AS ENUM('vol-new', 'vol-active', 'vol-available', 'vol-temp-unavailable', 'vol-inactive', 'vol-unresponsive')`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_engagement" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_engagement" TYPE "public"."volunteer_status_engagement_enum" USING "status_engagement"::"text"::"public"."volunteer_status_engagement_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_engagement" SET DEFAULT 'vol-new'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."volunteer_status_engagement_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."volunteer_status_match_enum" RENAME TO "volunteer_status_match_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_match_enum" AS ENUM('vol-no-matches', 'vol-pending-match', 'vol-matched', 'vol-needs-rematch')`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_match" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_match" TYPE "public"."volunteer_status_match_enum" USING "status_match"::"text"::"public"."volunteer_status_match_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_match" SET DEFAULT 'vol-no-matches'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."volunteer_status_match_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."opportunity_volunteer_status_enum" RENAME TO "opportunity_volunteer_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."opportunity_volunteer_status_enum" AS ENUM('opp-pending', 'opp-matched', 'opp-active', 'opp-past')`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" ALTER COLUMN "status" TYPE "public"."opportunity_volunteer_status_enum" USING "status"::"text"::"public"."opportunity_volunteer_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."opportunity_volunteer_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."opportunity_status_enum" RENAME TO "opportunity_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."opportunity_status_enum" AS ENUM('opp-new', 'opp-searching', 'opp-active', 'opp-past')`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ALTER COLUMN "status" TYPE "public"."opportunity_status_enum" USING "status"::"text"::"public"."opportunity_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ALTER COLUMN "status" SET DEFAULT 'opp-new'`,
    );
    await queryRunner.query(`DROP TYPE "public"."opportunity_status_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."agent_trust_level_enum" RENAME TO "agent_trust_level_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_trust_level_enum" AS ENUM('agent-high', 'agent-low', 'agent-unknown')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "trust_level" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "trust_level" TYPE "public"."agent_trust_level_enum" USING "trust_level"::"text"::"public"."agent_trust_level_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "trust_level" SET DEFAULT 'agent-unknown'`,
    );
    await queryRunner.query(`DROP TYPE "public"."agent_trust_level_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."agent_search_status_enum" RENAME TO "agent_search_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_search_status_enum" AS ENUM('agent-searching', 'agent-not-needed', 'agent-volunteers-found')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "search_status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "search_status" TYPE "public"."agent_search_status_enum" USING "search_status"::"text"::"public"."agent_search_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "search_status" SET DEFAULT 'agent-not-needed'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."agent_search_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."agent_engagement_status_enum" RENAME TO "agent_engagement_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_engagement_status_enum" AS ENUM('agent-new', 'agent-active', 'agent-unresponsive', 'agent-inactive')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "engagement_status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "engagement_status" TYPE "public"."agent_engagement_status_enum" USING "engagement_status"::"text"::"public"."agent_engagement_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "engagement_status" SET DEFAULT 'agent-new'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."agent_engagement_status_enum_old"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8c3af29493287693cdd82d99c1"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."comment_entity_type_enum" RENAME TO "comment_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."comment_entity_type_enum" AS ENUM('none', 'activity', 'agent', 'comment', 'category', 'district', 'language', 'lead_from', 'opportunity', 'skill', 'volunteer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ALTER COLUMN "entity_type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ALTER COLUMN "entity_type" TYPE "public"."comment_entity_type_enum" USING "entity_type"::"text"::"public"."comment_entity_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ALTER COLUMN "entity_type" SET DEFAULT 'none'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."comment_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8c3af29493287693cdd82d99c1" ON "comment" ("entity_type", "entity_id", "language_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8c3af29493287693cdd82d99c1"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."comment_entity_type_enum_old" AS ENUM('activity', 'category', 'comment', 'district', 'language', 'lead_from', 'none', 'opportunity', 'skill', 'volunteer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ALTER COLUMN "entity_type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ALTER COLUMN "entity_type" TYPE "public"."comment_entity_type_enum_old" USING "entity_type"::"text"::"public"."comment_entity_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ALTER COLUMN "entity_type" SET DEFAULT 'none'`,
    );
    await queryRunner.query(`DROP TYPE "public"."comment_entity_type_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."comment_entity_type_enum_old" RENAME TO "comment_entity_type_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8c3af29493287693cdd82d99c1" ON "comment" ("entity_id", "entity_type", "language_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_engagement_status_enum_old" AS ENUM('active', 'inactive', 'new', 'unresponsive')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "engagement_status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "engagement_status" TYPE "public"."agent_engagement_status_enum_old" USING "engagement_status"::"text"::"public"."agent_engagement_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "engagement_status" SET DEFAULT 'new'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."agent_engagement_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."agent_engagement_status_enum_old" RENAME TO "agent_engagement_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_search_status_enum_old" AS ENUM('not-needed', 'searching', 'volunteers-found')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "search_status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "search_status" TYPE "public"."agent_search_status_enum_old" USING "search_status"::"text"::"public"."agent_search_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "search_status" SET DEFAULT 'not-needed'`,
    );
    await queryRunner.query(`DROP TYPE "public"."agent_search_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."agent_search_status_enum_old" RENAME TO "agent_search_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_trust_level_enum_old" AS ENUM('high', 'low', 'unknown')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "trust_level" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "trust_level" TYPE "public"."agent_trust_level_enum_old" USING "trust_level"::"text"::"public"."agent_trust_level_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent" ALTER COLUMN "trust_level" SET DEFAULT 'unknown'`,
    );
    await queryRunner.query(`DROP TYPE "public"."agent_trust_level_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."agent_trust_level_enum_old" RENAME TO "agent_trust_level_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."opportunity_status_enum_old" AS ENUM('active', 'new', 'past', 'searching')`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ALTER COLUMN "status" TYPE "public"."opportunity_status_enum_old" USING "status"::"text"::"public"."opportunity_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity" ALTER COLUMN "status" SET DEFAULT 'new'`,
    );
    await queryRunner.query(`DROP TYPE "public"."opportunity_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."opportunity_status_enum_old" RENAME TO "opportunity_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."opportunity_volunteer_status_enum_old" AS ENUM('active', 'matched', 'past', 'pending')`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_volunteer" ALTER COLUMN "status" TYPE "public"."opportunity_volunteer_status_enum_old" USING "status"::"text"::"public"."opportunity_volunteer_status_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."opportunity_volunteer_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."opportunity_volunteer_status_enum_old" RENAME TO "opportunity_volunteer_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_match_enum_old" AS ENUM('matched', 'needs-rematch', 'no-matches', 'pending-match')`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_match" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_match" TYPE "public"."volunteer_status_match_enum_old" USING "status_match"::"text"::"public"."volunteer_status_match_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_match" SET DEFAULT 'no-matches'`,
    );
    await queryRunner.query(`DROP TYPE "public"."volunteer_status_match_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."volunteer_status_match_enum_old" RENAME TO "volunteer_status_match_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."volunteer_status_engagement_enum_old" AS ENUM('active', 'available', 'inactive', 'new', 'temp-unavailable', 'unresponsive')`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_engagement" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_engagement" TYPE "public"."volunteer_status_engagement_enum_old" USING "status_engagement"::"text"::"public"."volunteer_status_engagement_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "volunteer" ALTER COLUMN "status_engagement" SET DEFAULT 'new'`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."volunteer_status_engagement_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."volunteer_status_engagement_enum_old" RENAME TO "volunteer_status_engagement_enum"`,
    );
  }
}
