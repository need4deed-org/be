import { FastifyInstance } from "fastify";
import { AgentRoleType, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Address from "../../../data/entity/location/address.entity";
import AgentService from "../../../data/entity/m2m/agent-service";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Organization from "../../../data/entity/organization.entity";
import Person from "../../../data/entity/person.entity";
import Service from "../../../data/entity/profile/service.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { captureSql, maxToManyJoins } from "../../sql-capture";

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
  let volunteerCookie: string;
  let userCookie: string;
  let claimedAgent: Agent;
  let unclaimedAgent: Agent;
  let domainAgent: Agent;
  let domainOrg: Organization;
  let services: Service[];
  let postcodeValue: string;

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
    await fastify.db.userRepository.save(
      new User({
        email: `org-volunteer-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.VOLUNTEER,
        isActive: true,
      }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `org-user-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.USER,
        isActive: true,
      }),
    );
    postcodeValue = postcode.value;

    const agentRepository = dataSource.getRepository(Agent);
    claimedAgent = await agentRepository.save(
      new Agent({ title: `B Einrichtung ${suffix}`, organizationId: orgA.id }),
    );
    unclaimedAgent = await agentRepository.save(
      new Agent({
        title: `A Einrichtung ${suffix}`,
        organizationId: orgA.id,
        unclaimed: true,
      }),
    );
    services = await dataSource
      .getRepository(Service)
      .find({ order: { id: "ASC" }, take: 2 });
    await dataSource.getRepository(AgentService).save([
      new AgentService({ agentId: claimedAgent.id, serviceId: services[0].id }),
      new AgentService({ agentId: claimedAgent.id, serviceId: services[1].id }),
      new AgentService({
        agentId: unclaimedAgent.id,
        serviceId: services[1].id,
      }),
    ]);

    domainOrg = await organizationRepository.save(
      new Organization({
        title: `Domain Test Org ${suffix}`,
        website: `contact-${suffix}.example`,
      }),
    );
    domainAgent = await agentRepository.save(
      new Agent({ title: `Domain Einrichtung ${suffix}` }),
    );

    agentCookie = await login(`org-agent-${suffix}@test.need4deed.org`);
    volunteerCookie = await login(`org-volunteer-${suffix}@test.need4deed.org`);
    userCookie = await login(`org-user-${suffix}@test.need4deed.org`);
    coordinatorCookie = await login(
      `org-coordinator-${suffix}@test.need4deed.org`,
    );
  });

  afterAll(async () => {
    const addressRepository = dataSource.getRepository(Address);
    const organizationRepository = dataSource.getRepository(Organization);

    await fastify.db.userRepository.delete({ personId: ownerPerson.id });
    await fastify.db.userRepository.delete({
      email: `org-volunteer-${suffix}@test.need4deed.org`,
    });
    await fastify.db.userRepository.delete({
      email: `org-user-${suffix}@test.need4deed.org`,
    });
    await fastify.db.userRepository.delete({
      email: `org-coordinator-${suffix}@test.need4deed.org`,
    });
    const domainContacts = await fastify.db.agentPersonRepository.findBy({
      agentId: domainAgent.id,
    });
    await dataSource
      .getRepository(Agent)
      .delete([claimedAgent.id, unclaimedAgent.id, domainAgent.id]);
    if (domainContacts.length) {
      await fastify.db.personRepository.delete(
        domainContacts.map(({ personId }) => personId),
      );
    }
    await organizationRepository.delete({ id: domainOrg.id });
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

  describe("GET /organization/:id", () => {
    const get = (id: number, cookie?: string) =>
      fastify.inject({
        method: "GET",
        url: `/organization/${id}`,
        cookies: cookie ? { [accessCookieName]: cookie } : undefined,
      });

    it("returns the Träger with its Einrichtungen, derived services and contact", async () => {
      const res = await get(orgA.id, coordinatorCookie);
      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data).toMatchObject({
        id: orgA.id,
        title: orgA.title,
        about: null,
        email: null,
        contacts: [
          {
            personId: ownerPerson.id,
            firstName: "Org",
            lastName: "Owner",
          },
        ],
      });
      expect(data.agents.map((a: { id: number }) => a.id)).toEqual([
        unclaimedAgent.id,
        claimedAgent.id,
      ]);
      expect(data.services.map((s: { id: number }) => s.id)).toEqual(
        services.map(({ id }) => id),
      );
      expect(data.address.id).toBeDefined();
    });

    it("hides unclaimed Einrichtungen and their services from non-staff", async () => {
      const res = await get(orgA.id, agentCookie);
      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.agents.map((a: { id: number }) => a.id)).toEqual([
        claimedAgent.id,
      ]);
      expect(data.services.map((s: { id: number }) => s.id)).toEqual(
        services.map(({ id }) => id),
      );
    });

    it("returns an empty profile for a Träger without Einrichtungen", async () => {
      const res = await get(orgB.id, coordinatorCookie);
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toMatchObject({ agents: [], services: [] });
    });

    it("loads the Einrichtungen and services without a Cartesian join", async () => {
      const queries = await captureSql(async () => {
        expect((await get(orgA.id, coordinatorCookie)).statusCode).toBe(200);
      });
      expect(maxToManyJoins(queries)).toBeLessThanOrEqual(1);
      expect(
        queries.some(
          (q) => q.includes("agent_service") && q.includes("agent_person"),
        ),
      ).toBe(false);
    });

    it("rejects plain users", async () => {
      expect((await get(orgA.id, userCookie)).statusCode).toBe(403);
    });

    it("rejects volunteers and unauthenticated requests", async () => {
      expect((await get(orgA.id, volunteerCookie)).statusCode).toBe(403);
      expect((await get(orgA.id)).statusCode).toBe(401);
    });

    it("404s for a nonexistent organization id", async () => {
      expect((await get(999999999, coordinatorCookie)).statusCode).toBe(404);
    });

    it("exposes the Träger on its Einrichtungen", async () => {
      const res = await fastify.inject({
        method: "GET",
        url: `/agent/${claimedAgent.id}`,
        cookies: { [accessCookieName]: coordinatorCookie },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.organization).toEqual({
        id: orgA.id,
        title: orgA.title,
      });

      const unlinked = await fastify.inject({
        method: "GET",
        url: `/agent/${domainAgent.id}`,
        cookies: { [accessCookieName]: coordinatorCookie },
      });
      expect(unlinked.json().data.organization).toBeNull();
    });
  });

  describe("linking by email domain", () => {
    it("links an Einrichtung when a contact with the Träger's domain is added", async () => {
      const res = await fastify.inject({
        method: "POST",
        url: `/agent/${domainAgent.id}/contact`,
        cookies: { [accessCookieName]: coordinatorCookie },
        payload: {
          firstName: "Domain",
          lastName: "Contact",
          role: AgentRoleType.VOLUNTEER_COORDINATOR,
          email: `lead@contact-${suffix}.example`,
        },
      });
      expect(res.statusCode).toBe(201);
      const agent = await dataSource
        .getRepository(Agent)
        .findOneByOrFail({ id: domainAgent.id });
      expect(agent.organizationId).toBe(domainOrg.id);
    });
  });

  describe("PATCH /organization/:id", () => {
    const patch = (payload: object, id = orgB.id) =>
      fastify.inject({
        method: "PATCH",
        url: `/organization/${id}`,
        cookies: { [accessCookieName]: coordinatorCookie },
        payload,
      });
    const reload = () =>
      dataSource.getRepository(Organization).findOneByOrFail({ id: orgB.id });

    it("rejects a null or empty title", async () => {
      expect((await patch({ title: null })).statusCode).toBe(400);
      expect((await patch({ title: "" })).statusCode).toBe(400);
      expect((await reload()).title).toBe(orgB.title);
    });

    it("409s when the title belongs to another Träger", async () => {
      expect((await patch({ title: orgA.title })).statusCode).toBe(409);
    });

    it("strips unknown keys and saves the known ones", async () => {
      const res = await patch({
        email: "office@example.org",
        phone: "030 1234567",
        serviceIds: [1],
        about: "ignored",
      });
      expect(res.statusCode).toBe(204);
      expect(await reload()).toMatchObject({
        email: "office@example.org",
        phone: "030 1234567",
      });
    });

    it("clears nullable fields with null", async () => {
      expect((await patch({ email: null, phone: "" })).statusCode).toBe(204);
      expect(await reload()).toMatchObject({ email: null, phone: null });
    });

    it("clears the street alone and keeps the postcode", async () => {
      expect((await patch({ addressStreet: null })).statusCode).toBe(204);
      const organization = await reload();
      const address = await dataSource
        .getRepository(Address)
        .findOneByOrFail({ id: organization.addressId! });
      expect(address.street).toBeNull();
      expect(address.postcodeId).toBe(addressB.postcodeId);
    });

    it("rejects clearing the postcode alone", async () => {
      expect((await patch({ addressPostcode: null })).statusCode).toBe(400);
      expect((await reload()).addressId).toBe(addressB.id);
    });

    it("gives a shared address its own copy instead of editing it", async () => {
      const sharedAgent = await dataSource.getRepository(Agent).save(
        new Agent({
          title: `Shared Address ${suffix}`,
          addressId: addressB.id,
        }),
      );
      try {
        expect(
          (await patch({ addressStreet: "Eigene Straße 2" })).statusCode,
        ).toBe(204);
        const organization = await reload();
        expect(organization.addressId).not.toBe(addressB.id);
        const untouched = await dataSource
          .getRepository(Address)
          .findOneByOrFail({ id: addressB.id });
        expect(untouched.street).not.toBe("Eigene Straße 2");
        await dataSource
          .getRepository(Organization)
          .update({ id: orgB.id }, { addressId: addressB.id });
        await dataSource
          .getRepository(Address)
          .delete({ id: organization.addressId! });
      } finally {
        await dataSource.getRepository(Agent).delete({ id: sharedAgent.id });
      }
    });

    it("updates the address and clears it with nulls", async () => {
      expect(
        (
          await patch({
            addressStreet: "Neue Straße 1",
            addressPostcode: postcodeValue,
          })
        ).statusCode,
      ).toBe(204);
      const updated = await dataSource
        .getRepository(Address)
        .findOneByOrFail({ id: addressB.id });
      expect(updated.street).toBe("Neue Straße 1");

      expect(
        (await patch({ addressStreet: null, addressPostcode: null }))
          .statusCode,
      ).toBe(204);
      expect((await reload()).addressId).toBeNull();
    });

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
