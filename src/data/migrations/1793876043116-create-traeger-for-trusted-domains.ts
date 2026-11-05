import { MigrationInterface, QueryRunner } from "typeorm";
import { domainOrganizationTitles } from "../utils/organization-titles";

export class CreateTraegerForTrustedDomains1793876043116
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: { domain: string }[] = await queryRunner.query(
      `SELECT DISTINCT lower("domain") AS "domain" FROM "trusted_domain" ORDER BY 1`,
    );
    let created = 0;
    for (const { domain } of rows) {
      const titles = domainOrganizationTitles(domain);
      if (!titles) {
        continue;
      }
      const [{ exists }]: { exists: boolean }[] = await queryRunner.query(
        `SELECT EXISTS (
           SELECT 1 FROM "organization" o
            WHERE rtrim(regexp_replace(regexp_replace(lower(btrim(coalesce(o."website", ''))), '^[a-z][a-z0-9+.-]*://', ''), '^www\\.|[:/?#].*$', '', 'g'), '.') = $1
               OR lower(o."title") = ANY($2)
         ) AS "exists"`,
        [
          domain.replace(/^www\./, ""),
          [domain, ...titles].map((t) => t.toLowerCase()),
        ],
      );
      if (exists && titles.length === 1) {
        continue;
      }
      for (const title of titles) {
        const inserted: unknown[] = await queryRunner.query(
          `INSERT INTO "organization" ("title", "website") VALUES ($1, $2)
           ON CONFLICT ("title") DO NOTHING
           RETURNING "id"`,
          [title, domain],
        );
        created += inserted.length;
      }
    }
    queryRunner.connection.logger.log(
      "info",
      `[traeger-for-trusted-domains] created ${created}`,
    );
  }

  // Data correction: created Träger may already be linked or renamed.
  public async down(): Promise<void> {}
}
