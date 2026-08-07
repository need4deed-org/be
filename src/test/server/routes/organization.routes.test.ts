import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Address from "../../../data/entity/location/address.entity";
import Organization from "../../../data/entity/organization.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";

const PASSWORD = "test_password";

function getCookie(
  cookies: { name: string; value: string }[],
  name: string,
): string {
  const cookie = cookies.find((c) => c.name === name)?.value;
  if (!cookie) {
    throw new Error(`Cookie ${name} not found in response`);
  }
  return cookie;
}

describe("organization.routes", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  let ownerPerson: Person;
  let agentCookie: string;
  let coordinatorCookie: string;

  let addressA: Address;
  let addressB: Address;
  let orgA: Organization;
  let orgB: Organization;

  async function login(email: string): Promise<string> {
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    return getCookie(res.cookies, accessCookieName);
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    const addressRepository = dataSource.getRepository(Address);
    const organizationRepository = dataSource.getRepository(Organization);

    ownerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Org", lastName: "Owner" }),
    );

    addressA = await addressRepository.save(
      new Address({ postcodeId: postcode.id }),
    );
    addressB = await addressRepository.save(
      new Address({ postcodeId: postcode.id }),
    );
    // Titles deliberately out of alphabetical creation order, to assert the
    // list route sorts rather than returning insertion order.
    orgB = await organizationRepository.save(
      new Organization({
        title: `Z Test Org ${suffix}`,
        addressId: addressB.id,
        personId: ownerPerson.id,
      }),
    );
    orgA = await organizationRepository.save(
      new Organization({
        title: `A Test Org ${suffix}`,
        addressId: addressA.id,
        personId: ownerPerson.id,
      }),
    );

    const pwHash = await hashPassword(PASSWORD);
    await fastify.db.userRepository.save(
      new User({
        email: `org-agent-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.AGENT,
        isActive: true,
        personId: ownerPerson.id,
      }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `org-coordinator-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
      }),
    );
    agentCookie = await login(`org-agent-${suffix}@test.need4deed.org`);
    coordinatorCookie = await login(
      `org-coordinator-${suffix}@test.need4deed.org`,
    );
  });

  afterAll(async () => {
    const addressRepository = dataSource.getRepository(Address);
    const organizationRepository = dataSource.getRepository(Organization);

    await fastify.db.userRepository.delete({ personId: ownerPerson.id });
    await organizationRepository.delete({ id: orgA.id });
    await organizationRepository.delete({ id: orgB.id });
    await fastify.db.personRepository.delete({ id: ownerPerson.id });
    await addressRepository.delete({ id: addressA.id });
    await addressRepository.delete({ id: addressB.id });
    await fastify.close();
  });

  describe("GET /organization", () => {
    it("rejects an unauthenticated request", async () => {
      const res = await fastify.inject({ method: "GET", url: "/organization" });
      expect(res.statusCode).toBe(401);
    });

    it("allows any authenticated role (e.g. AGENT) to list organizations — it's just a name dropdown, no PII", async () => {
      const res = await fastify.inject({
        method: "GET",
        url: "/organization",
        cookies: { [accessCookieName]: agentCookie },
      });
      expect(res.statusCode).toBe(200);

      const titles = res.json().data.map((org: { title: string }) => org.title);
      expect(titles).toContain(orgA.title);
      expect(titles).toContain(orgB.title);
    });

    it("returns organizations sorted by title ascending, and only id/title fields", async () => {
      const res = await fastify.inject({
        method: "GET",
        url: "/organization",
        cookies: { [accessCookieName]: coordinatorCookie },
      });

      const data: { id: number; title: string }[] = res.json().data;
      const indexA = data.findIndex((org) => org.id === orgA.id);
      const indexB = data.findIndex((org) => org.id === orgB.id);
      expect(indexA).toBeLessThan(indexB);

      const found = data.find((org) => org.id === orgA.id);
      expect(Object.keys(found ?? {}).sort()).toEqual(["id", "title"]);
    });
  });

  describe("PATCH /organization/:id", () => {
    it("rejects an unauthenticated request", async () => {
      const res = await fastify.inject({
        method: "PATCH",
        url: `/organization/${orgA.id}`,
        payload: { title: "Nope" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("rejects a non-COORDINATOR role (e.g. AGENT)", async () => {
      const res = await fastify.inject({
        method: "PATCH",
        url: `/organization/${orgA.id}`,
        cookies: { [accessCookieName]: agentCookie },
        payload: { title: "Nope" },
      });
      expect(res.statusCode).toBe(403);
    });

    it("404s for a nonexistent organization id", async () => {
      const res = await fastify.inject({
        method: "PATCH",
        url: "/organization/999999999",
        cookies: { [accessCookieName]: coordinatorCookie },
        payload: { title: "Nope" },
      });
      expect(res.statusCode).toBe(404);
    });

    it("allows a COORDINATOR to patch organization fields", async () => {
      const res = await fastify.inject({
        method: "PATCH",
        url: `/organization/${orgA.id}`,
        cookies: { [accessCookieName]: coordinatorCookie },
        payload: { website: "https://updated.example.org" },
      });
      expect(res.statusCode).toBe(204);

      const updated = await dataSource
        .getRepository(Organization)
        .findOneByOrFail({ id: orgA.id });
      expect(updated.website).toBe("https://updated.example.org");
    });
  });
});
