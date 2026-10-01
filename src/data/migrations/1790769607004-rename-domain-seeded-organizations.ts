import { MigrationInterface, QueryRunner } from "typeorm";
import {
  loadOrganizationTitleMap,
  NEW_ORGANIZATIONS,
  PRIMARY_ORGANIZATION_DOMAINS,
} from "../utils/organization-titles";

// be#1061: SeedOrganizationFromAgentDomains1786109950000 seeded operator
// (Träger) titles verbatim from email domains (e.g. "drk-berlin.de"), which
// is what the Operator picker shows. This applies the reviewed domain ->
// title map (CDN with a built-in fallback, see ../utils/organization-titles)
// to every row whose title is still its raw domain — anything staff already
// renamed via PATCH /organization/:id is left alone:
//   - title null: not an operator; agents pointing at it lose the operator
//     (organization_id -> NULL, the FK has no cascade) and the row is deleted
//   - title already taken (another domain of the same operator, or a row
//     staff created): merged — agents move to that row, this one is deleted
//   - otherwise: renamed, with the domain moved into `website` if empty
//   - several titles (operators sharing the domain): the row is handled as
//     above for the first, the others are inserted with the domain as
//     `website`; agents on the row stay with the first operator
// Then operators missing from the seed are inserted.
//
// Raw SQL only, no entities.
export class RenameDomainSeededOrganizations1790769607004
  implements MigrationInterface
{
  name = "RenameDomainSeededOrganizations1790769607004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const titles = await loadOrganizationTitleMap();
    const domains = [
      ...PRIMARY_ORGANIZATION_DOMAINS.filter((d) => d in titles),
      ...Object.keys(titles).filter(
        (d) => !PRIMARY_ORGANIZATION_DOMAINS.includes(d),
      ),
    ];

    const counts = { renamed: 0, merged: 0, removed: 0, unlinkedAgents: 0 };
    const extra: { title: string; website: string }[] = [];
    for (const domain of domains) {
      const entry = titles[domain];
      const [title, ...others] = Array.isArray(entry) ? entry : [entry];
      const [row]: { id: number }[] = await queryRunner.query(
        `SELECT "id" FROM "organization" WHERE "title" = $1`,
        [domain],
      );
      // Added even when the seeded row is gone (already handled by staff),
      // so every operator sharing the domain ends up existing.
      extra.push(...others.map((t) => ({ title: t, website: domain })));
      if (!row) {
        continue;
      }

      if (title === null) {
        const [, unlinked]: [unknown, number] = await queryRunner.query(
          `UPDATE "agent" SET "organization_id" = NULL WHERE "organization_id" = $1`,
          [row.id],
        );
        await queryRunner.query(`DELETE FROM "organization" WHERE "id" = $1`, [
          row.id,
        ]);
        counts.removed += 1;
        counts.unlinkedAgents += unlinked;
        continue;
      }

      const [target]: { id: number }[] = await queryRunner.query(
        `SELECT "id" FROM "organization" WHERE "title" = $1`,
        [title],
      );
      if (target) {
        await queryRunner.query(
          `UPDATE "agent" SET "organization_id" = $1 WHERE "organization_id" = $2`,
          [target.id, row.id],
        );
        await queryRunner.query(`DELETE FROM "organization" WHERE "id" = $1`, [
          row.id,
        ]);
        counts.merged += 1;
        continue;
      }

      await queryRunner.query(
        `UPDATE "organization"
         SET "title" = $2, "website" = COALESCE(NULLIF("website", ''), $1)
         WHERE "id" = $3`,
        [domain, title, row.id],
      );
      counts.renamed += 1;
    }

    for (const { title, website } of [...extra, ...NEW_ORGANIZATIONS]) {
      await queryRunner.query(
        `INSERT INTO "organization" ("title", "website") VALUES ($1, $2)
         ON CONFLICT ("title") DO NOTHING`,
        [title, website],
      );
    }

    console.warn(
      `[rename-domain-seeded-organizations] renamed ${counts.renamed}, merged ${counts.merged}, removed ${counts.removed} (unlinked ${counts.unlinkedAgents} agent(s)) of ${domains.length} candidates`,
    );
  }

  // Lossy: restores the domain title of each surviving renamed row (via the
  // domain kept in `website`, falling back to the map) and drops the inserted
  // operators nobody uses. Merged and removed rows aren't recreated, and
  // agents unlinked from a removed operator stay unlinked.
  public async down(queryRunner: QueryRunner): Promise<void> {
    const titles = await loadOrganizationTitleMap();
    const extra: string[] = [];
    for (const [domain, entry] of Object.entries(titles)) {
      if (entry === null) {
        continue;
      }
      const [title, ...others] = Array.isArray(entry) ? entry : [entry];
      extra.push(...others);
      await queryRunner.query(
        `UPDATE "organization" SET "title" = $1
         WHERE "title" = $2
           AND NOT EXISTS (SELECT 1 FROM "organization" WHERE "title" = $1)
           AND ("website" IS NULL OR "website" = $1)`,
        [domain, title],
      );
    }
    for (const title of [...extra, ...NEW_ORGANIZATIONS.map((o) => o.title)]) {
      await queryRunner.query(
        `DELETE FROM "organization" o WHERE o."title" = $1
           AND NOT EXISTS (SELECT 1 FROM "agent" a WHERE a."organization_id" = o."id")`,
        [title],
      );
    }
  }
}
