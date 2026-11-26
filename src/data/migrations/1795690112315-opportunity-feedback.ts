import { MigrationInterface, QueryRunner } from "typeorm";

export class OpportunityFeedback1795690112315 implements MigrationInterface {
  name = "OpportunityFeedback1795690112315";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "opportunity_feedback" ("id" SERIAL NOT NULL, "opportunity_id" integer NOT NULL, "author_user_id" integer NOT NULL, "text" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d75f6fd62108d88cea83d424e9b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_086a529cfe4e38865f5689aebb" ON "opportunity_feedback" ("opportunity_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_734b595415709cf5a6bbe25a8f" ON "opportunity_feedback" ("author_user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_feedback" ADD CONSTRAINT "FK_086a529cfe4e38865f5689aebbb" FOREIGN KEY ("opportunity_id") REFERENCES "opportunity"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_feedback" ADD CONSTRAINT "FK_734b595415709cf5a6bbe25a8f8" FOREIGN KEY ("author_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "opportunity_feedback" DROP CONSTRAINT "FK_734b595415709cf5a6bbe25a8f8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "opportunity_feedback" DROP CONSTRAINT "FK_086a529cfe4e38865f5689aebbb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_734b595415709cf5a6bbe25a8f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_086a529cfe4e38865f5689aebb"`,
    );
    await queryRunner.query(`DROP TABLE "opportunity_feedback"`);
  }
}
