import { MigrationInterface, QueryRunner } from "typeorm";
import { loadOrganizationTitleMap } from "../utils/organization-titles";

// be#1061: SeedOrganizationFromAgentDomains1786109950000 seeded operator
// (Träger) titles verbatim from email domains (e.g. "drk-berlin.de"), which
// is what the Operator picker shows. This renames them to human-readable
// names — staff still fix any remaining naming via PATCH /organization/:id.
// The domain -> title map comes from the CDN with a built-in fallback, see
// ../utils/organization-titles.
//
// Only rows whose title is still the raw domain are touched, so anything
// staff already renamed is left alone. A rename is skipped (and logged) if
// another organization already has the target title (title is unique).
// The domain moves into `website` when that's empty, so it isn't lost.
//
// A few seeded domains are the same organization twice (a typo, an alias
// domain). Those are merged first: agents pointing at the alias are moved to
// the canonical row, and the alias row is deleted.
//
// Raw SQL only, no entities.
export class RenameDomainSeededOrganizations1790769607004
  implements MigrationInterface
{
  name = "RenameDomainSeededOrganizations1790769607004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const { titles, aliases } = await loadOrganizationTitleMap();

    for (const [alias, canonical] of Object.entries(aliases)) {
      const [aliasRow]: { id: number }[] = await queryRunner.query(
        `SELECT "id" FROM "organization" WHERE "title" = $1`,
        [alias],
      );
      if (!aliasRow) {
        continue;
      }
      // The canonical row may still carry its domain or already be renamed.
      const [canonicalRow]: { id: number }[] = await queryRunner.query(
        `SELECT "id" FROM "organization" WHERE "title" IN ($1, $2) ORDER BY "id" LIMIT 1`,
        [canonical, titles[canonical] ?? canonical],
      );
      if (canonicalRow) {
        await queryRunner.query(
          `UPDATE "agent" SET "organization_id" = $1 WHERE "organization_id" = $2`,
          [canonicalRow.id, aliasRow.id],
        );
        await queryRunner.query(`DELETE FROM "organization" WHERE "id" = $1`, [
          aliasRow.id,
        ]);
      } else {
        // No canonical row: the alias row becomes it.
        await queryRunner.query(
          `UPDATE "organization" SET "title" = $1 WHERE "id" = $2`,
          [canonical, aliasRow.id],
        );
      }
    }

    const entries = Object.entries(titles);
    let renamed = 0;
    const skipped: string[] = [];
    for (const [domain, title] of entries) {
      const rows: { id: number }[] = await queryRunner.query(
        `UPDATE "organization"
         SET "title" = $2, "website" = COALESCE(NULLIF("website", ''), $1)
         WHERE "title" = $1
           AND NOT EXISTS (SELECT 1 FROM "organization" WHERE "title" = $2)
         RETURNING "id"`,
        [domain, title],
      );
      if (rows.length) {
        renamed += 1;
        continue;
      }
      const [stillDomain]: { id: number }[] = await queryRunner.query(
        `SELECT "id" FROM "organization" WHERE "title" = $1`,
        [domain],
      );
      if (stillDomain) {
        skipped.push(domain);
      }
    }

    console.warn(
      `[rename-domain-seeded-organizations] renamed ${renamed} of ${entries.length} candidates`,
    );
    if (skipped.length) {
      console.warn(
        `[rename-domain-seeded-organizations] skipped (target title already taken): ${skipped.join(", ")}`,
      );
    }
  }

  // Restores the domain titles of rows that still carry the mapped title.
  // Uses the same (CDN or built-in) map as up(). Merged alias rows aren't
  // recreated, and `website` is left as is.
  public async down(queryRunner: QueryRunner): Promise<void> {
    const { titles } = await loadOrganizationTitleMap();
    for (const [domain, title] of Object.entries(titles)) {
      await queryRunner.query(
        `UPDATE "organization" SET "title" = $1
         WHERE "title" = $2
           AND NOT EXISTS (SELECT 1 FROM "organization" WHERE "title" = $1)`,
        [domain, title],
      );
    }
  }
}
