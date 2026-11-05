import { MigrationInterface, QueryRunner } from "typeorm";
import { websiteDomainSql } from "../../server/utils/data/ensure-domain-organization";

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
           WHERE ${websiteDomainSql('o."website"')} = td."domain"
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
