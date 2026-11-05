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
import { createServer } from "../../../server";
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
    const names = ["new", "renamed", "existing", "legacy"].map(domain);
    await fastify.db.trustedDomainRepository.delete({
      domain: In([...names, domain("before-rename")]),
    });
    await fastify.db.organizationRepository.delete({
      title: In([...names, domain("before-rename"), `Existing ${suffix}`]),
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

  it("creates the Träger for a renamed domain", async () => {
    const created = await post(domain("before-rename"));
    const res = await fastify.inject({
      method: "PATCH",
      url: `/trusted-domain/${created.json().data.id}`,
      cookies: { [accessCookieName]: cookie },
      payload: { domain: domain("renamed") },
    });
    expect(res.statusCode).toBe(200);
    expect(await traegerFor(domain("renamed"))).toHaveLength(1);
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

  it("backfills Träger for domains added before the fix", async () => {
    await fastify.db.trustedDomainRepository.save({ domain: domain("legacy") });
    const queryRunner =
      fastify.db.organizationRepository.manager.connection.createQueryRunner();
    try {
      await new CreateTraegerForTrustedDomains1793876043116().up(queryRunner);
      await new CreateTraegerForTrustedDomains1793876043116().up(queryRunner);
    } finally {
      await queryRunner.release();
    }
    expect(await traegerFor(domain("legacy"))).toHaveLength(1);
  });
});
