import { MigrationInterface, QueryRunner } from "typeorm";

// Creates the trusted_domain allowlist and seeds the known RAC email domains.
// Self-contained: raw SQL + hardcoded literals only (no entities/app code), so
// it replays cleanly regardless of how the entity later evolves.
//
// The seed list is the agreed allowlist, deduped (the source had need4deed.org
// and eu-homecare.com twice). ON CONFLICT keeps it idempotent.

const TRUSTED_DOMAINS = [
  "need4deed.org",
  "lfg-b.de",
  "berliner-stadtmission.de",
  "awo-mitte.de",
  "prisod-wohnen.de",
  "albatrosggmbh.de",
  "gu-oberhafen.de",
  "heroeurope.com",
  "tamaja-gu.de",
  "volkssolidaritaet.de",
  "unionhilfswerk.de",
  "cjd.de",
  "centro-hotels.de",
  "stephanus.org",
  "city54.de",
  "milaa-berlin.de",
  "stk118.de",
  "drk-mueggelspree.de",
  "laf.berlin.de",
  "ejf.de",
  "diakonie-stadtmitte.de",
  "tamaja.de",
  "pgssoziales.de",
  "caritas-berlin.de",
  "eu-homecare.com",
  "ib.de",
  "sin-ev.de",
  "johanniter.de",
  "gu-freudstr.de",
  "cityeleven.de",
  "gu-rauchstr.de",
  "nbhs.de",
  "soziales-berlin.com",
  "pfefferwerk.de",
  "kieztandem.de",
  "xenion.org",
];

export class AddTrustedDomain1781277697986 implements MigrationInterface {
  name = "AddTrustedDomain1781277697986";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "trusted_domain" ("id" SERIAL NOT NULL, "domain" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b8c4fcc9a45771d9f59e1dd6b1b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3998cf87b5faec4e52018bddbd" ON "trusted_domain" ("domain")`,
    );

    const values = TRUSTED_DOMAINS.map((_, i) => `($${i + 1})`).join(", ");
    await queryRunner.query(
      `INSERT INTO "trusted_domain" ("domain") VALUES ${values} ON CONFLICT ("domain") DO NOTHING`,
      TRUSTED_DOMAINS,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3998cf87b5faec4e52018bddbd"`,
    );
    await queryRunner.query(`DROP TABLE "trusted_domain"`);
  }
}
