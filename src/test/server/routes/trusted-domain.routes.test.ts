import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { In } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Organization from "../../../data/entity/organization.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { CreateTraegerForTrustedDomains1793876043116 } from "../../../data/migrations/1793876043116-create-traeger-for-trusted-domains";
import { hashPassword } from "../../../data/utils";
import { BUILTIN_ORGANIZATION_TITLES } from "../../../data/utils/organization-titles";
import { createServer } from "../../../server";
import { ensureDomainOrganization } from "../../../server/utils";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

describe("trusted domains create their Träger (be#1285)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  const domain = (name: string) => `${name}-${suffix}.example.org`;
  let person: Person;
  let cookie: string;

  const post = (value: string) =>
    fastify.inject({
      method: "POST",
      url: "/trusted-domain",
      cookies: { [accessCookieName]: cookie },
      payload: { domain: value },
    });

  const traegerFor = (value: string) =>
    fastify.db.organizationRepository.find({
      where: [{ title: value }, { website: value }],
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    person = await fastify.db.personRepository.save(
      new Person({ firstName: "Domain", lastName: `Coord${suffix}` }),
    );
    const email = `domain-coord-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: person.id,
      }),
    );
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    cookie = res.cookies.find((c) => c.name === accessCookieName)
      ?.value as string;
  });

  afterAll(async () => {
    const names = [
      "new",
      "before-rename",
      "renamed",
      "before-merge",
      "merged",
      "existing",
      "shouty",
      "www-rename",
      "enriched",
      "enriched-renamed",
      "www-existing",
      "duplicate",
      "shared",
      "shared-renamed",
    ].map(domain);
    names.push(
      `www.${domain("www-rename")}`,
      `www.${domain("www-existing")}`,
      `www.${domain("shared")}`,
    );
    await fastify.db.trustedDomainRepository.delete({ domain: In(names) });
    await fastify.db.organizationRepository.delete({
      title: In([
        ...names,
        `Existing ${suffix}`,
        `Shouty ${suffix}`,
        `WWW ${suffix}`,
      ]),
    });
    await fastify.db.userRepository.delete({ personId: person.id });
    await fastify.db.personRepository.delete({ id: person.id });
    await fastify.close();
  });

  it("adds the new domain to the Träger list", async () => {
    const res = await post(domain("new"));
    expect(res.statusCode).toBe(201);

    const list = await fastify.inject({
      method: "GET",
      url: "/organization",
      cookies: { [accessCookieName]: cookie },
    });
    const titles = list.json().data.map((o: { title: string }) => o.title);
    expect(titles).toContain(domain("new"));
  });

  const patch = (id: number, value: string) =>
    fastify.inject({
      method: "PATCH",
      url: `/trusted-domain/${id}`,
      cookies: { [accessCookieName]: cookie },
      payload: { domain: value },
    });

  it("moves the auto-created Träger along with a renamed domain", async () => {
    const created = await post(domain("before-rename"));
    const res = await patch(created.json().data.id, domain("renamed"));
    expect(res.statusCode).toBe(200);
    expect(await traegerFor(domain("renamed"))).toHaveLength(1);
    expect(await traegerFor(domain("before-rename"))).toHaveLength(0);
  });

  it("drops the stale auto-created Träger when the new domain already has one", async () => {
    await fastify.db.organizationRepository.save(
      new Organization({ title: domain("merged"), website: domain("merged") }),
    );
    const created = await post(domain("before-merge"));
    const res = await patch(created.json().data.id, domain("merged"));
    expect(res.statusCode).toBe(200);
    expect(await traegerFor(domain("merged"))).toHaveLength(1);
    expect(await traegerFor(domain("before-merge"))).toHaveLength(0);
  });

  it("keeps the Träger when a www. domain is renamed to its bare form", async () => {
    const created = await post(`www.${domain("www-rename")}`);
    const res = await patch(created.json().data.id, domain("www-rename"));
    expect(res.statusCode).toBe(200);
    expect(await traegerFor(domain("www-rename"))).toHaveLength(1);
    expect(await traegerFor(`www.${domain("www-rename")}`)).toHaveLength(0);
  });

  it("leaves a Träger a coordinator filled in where it is on rename", async () => {
    const created = await post(domain("enriched"));
    await fastify.db.organizationRepository.update(
      { title: domain("enriched") },
      { email: `info@${domain("enriched")}` },
    );
    const res = await patch(created.json().data.id, domain("enriched-renamed"));
    expect(res.statusCode).toBe(200);
    expect(await traegerFor(domain("enriched"))).toHaveLength(1);
    expect(await traegerFor(domain("enriched-renamed"))).toHaveLength(1);
  });

  it("matches an existing Träger for a domain entered with www.", async () => {
    await fastify.db.organizationRepository.save(
      new Organization({
        title: `WWW ${suffix}`,
        website: `https://${domain("www-existing")}`,
      }),
    );
    const res = await post(`www.${domain("www-existing")}`);
    expect(res.statusCode).toBe(201);
    expect(await traegerFor(`www.${domain("www-existing")}`)).toHaveLength(0);
  });

  it("keeps a Träger another trusted domain still relies on when renaming", async () => {
    const created = await post(domain("shared"));
    await post(`www.${domain("shared")}`);
    const res = await patch(created.json().data.id, domain("shared-renamed"));
    expect(res.statusCode).toBe(200);
    expect(await traegerFor(domain("shared"))).toHaveLength(1);
    expect(await traegerFor(domain("shared-renamed"))).toHaveLength(1);
  });

  it("creates every operator of a domain they share", async () => {
    const queryRunner =
      fastify.db.organizationRepository.manager.connection.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `UPDATE "organization" SET "title" = "title" || ' ' || "id", "website" = NULL
          WHERE "website" ILIKE '%wittenau-sued.de%' OR "title" = ANY($1)`,
        [BUILTIN_ORGANIZATION_TITLES["wittenau-sued.de"]],
      );
      await ensureDomainOrganization(queryRunner.manager, "wittenau-sued.de");
      expect(
        await queryRunner.manager.countBy(Organization, {
          website: "wittenau-sued.de",
        }),
      ).toBe(2);
    } finally {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    }
  });

  it("answers 409 when the domain is already trusted", async () => {
    expect((await post(domain("duplicate"))).statusCode).toBe(201);
    expect((await post(domain("duplicate"))).statusCode).toBe(409);
  });

  it("doesn't duplicate a Träger that already has the domain as its website", async () => {
    await fastify.db.organizationRepository.save(
      new Organization({
        title: `Existing ${suffix}`,
        website: `https://www.${domain("existing")}/`,
      }),
    );
    const res = await post(domain("existing"));
    expect(res.statusCode).toBe(201);
    expect(await traegerFor(domain("existing"))).toHaveLength(0);
    expect(
      await fastify.db.organizationRepository.countBy({
        title: `Existing ${suffix}`,
      }),
    ).toBe(1);
  });

  it("matches a Träger whose website has an upper-case scheme, port and query", async () => {
    await fastify.db.organizationRepository.save(
      new Organization({
        title: `Shouty ${suffix}`,
        website: ` HTTPS://WWW.${domain("shouty").toUpperCase()}:443/?lang=de`,
      }),
    );
    const res = await post(domain("shouty"));
    expect(res.statusCode).toBe(201);
    expect(await traegerFor(domain("shouty"))).toHaveLength(0);
  });

  it("backfills one Träger per host, skipping non-operators", async () => {
    const legacy = domain("legacy");
    const nonOperator = "kulturnest.org";
    const queryRunner =
      fastify.db.organizationRepository.manager.connection.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `INSERT INTO "trusted_domain" ("domain") VALUES ($1), ($2), ($3), ($4)
         ON CONFLICT ("domain") DO NOTHING`,
        [legacy, `www.${legacy}`, domain("mixed").toUpperCase(), nonOperator],
      );
      await queryRunner.query(
        `INSERT INTO "organization" ("title", "website") VALUES ($1, $2)`,
        [`Mixed ${suffix}`, `https://${domain("mixed")}`],
      );
      const migration = new CreateTraegerForTrustedDomains1793876043116();
      await migration.up(queryRunner);
      await migration.up(queryRunner);
      const count = async (website: string) => {
        const [{ n }]: { n: number }[] = await queryRunner.query(
          `SELECT count(*)::int AS "n" FROM "organization" WHERE lower("website") = $1`,
          [website],
        );
        return n;
      };
      expect(await count(legacy)).toBe(1);
      expect(await count(`www.${legacy}`)).toBe(0);
      expect(await count(domain("mixed"))).toBe(0);
      expect(
        await queryRunner.manager.countBy(Organization, { title: nonOperator }),
      ).toBe(0);
    } finally {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    }
  });
});
