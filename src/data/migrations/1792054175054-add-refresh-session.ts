import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRefreshSession1792054175054 implements MigrationInterface {
  name = "AddRefreshSession1792054175054";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "refresh_session" ("id" uuid NOT NULL, "user_id" integer NOT NULL, "current_jti" uuid NOT NULL, "previous_jti" uuid, "rotated_at" TIMESTAMP, "expires_at" TIMESTAMP NOT NULL, "revoked_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5d0d8c21064803b5b2baaa50cbb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_684b73eb2dd26a45b1fdc0ca17" ON "refresh_session" ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_session" ADD CONSTRAINT "FK_684b73eb2dd26a45b1fdc0ca178" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_session" DROP CONSTRAINT "FK_684b73eb2dd26a45b1fdc0ca178"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_684b73eb2dd26a45b1fdc0ca17"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_session"`);
  }
}
