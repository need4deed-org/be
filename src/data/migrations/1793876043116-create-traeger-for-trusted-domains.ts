import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTraegerForTrustedDomains1793876043116
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const inserted: unknown[] = await queryRunner.query(
      `INSERT INTO "organization" ("title", "website")
       SELECT td."domain", td."domain"
         FROM "trusted_domain" td
        WHERE NOT EXISTS (
          SELECT 1 FROM "organization" o
           WHERE rtrim(regexp_replace(regexp_replace(lower(btrim(coalesce(o."website", ''))), '^[a-z][a-z0-9+.-]*://', ''), '^www\\.|[:/?#].*$', '', 'g'), '.') = regexp_replace(td."domain", '^www\\.', '')
              OR lower(o."title") = td."domain"
        )
       ON CONFLICT ("title") DO NOTHING
       RETURNING "id"`,
    );
    queryRunner.connection.logger.log(
      "info",
      `[traeger-for-trusted-domains] created ${inserted.length}`,
    );
  }

  // Data correction: created Träger may already be linked or renamed.
  public async down(): Promise<void> {}
}
