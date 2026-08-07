import { FastifyInstance } from "fastify";
import { AgentMembershipStatus, AgentRoleType, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Address from "../../../data/entity/location/address.entity";
import District from "../../../data/entity/location/district.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import DistrictPostcode from "../../../data/entity/m2m/district-postcode";
import Agent from "../../../data/entity/opportunity/agent.entity";
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

describe("PATCH /agent/:id organization details", () => {
  let fastify: FastifyInstance;

  let agent: Agent;
  let otherAgent: Agent;
  let memberPerson: Person;
  let pendingPerson: Person;

  let memberCookie: string;
  let pendingCookie: string;
  let nonMemberCookie: string;
  let plainUserCookie: string;
  let coordinatorCookie: string;
  let adminCookie: string;
  let otherAgentMemberCookie: string;
  let noPersonCookie: string;

  const personIds: number[] = [];
  const orphanUserIds: number[] = [];

  async function login(email: string): Promise<string> {
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    return getCookie(res.cookies, accessCookieName);
  }

  async function createUser(
    label: string,
    role: UserRole,
    suffix: string,
  ): Promise<{ person: Person; email: string }> {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: label }),
    );
    personIds.push(person.id);
    const email = `${label.toLowerCase()}-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role,
        isActive: true,
        personId: person.id,
      }),
    );
    return { person, email };
  }

  // AGENT-role user with no linked Person at all (data-integrity edge case,
  // not something the registration flow produces, but the handler must not
  // crash and must deny rather than throw).
  async function createUserWithoutPerson(
    label: string,
    role: UserRole,
    suffix: string,
  ): Promise<{ email: string }> {
    const email = `${label.toLowerCase()}-${suffix}@test.need4deed.org`;
    const user = await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role,
        isActive: true,
      }),
    );
    orphanUserIds.push(user.id);
    return { email };
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Agent ${suffix}` }),
    );

    const member = await createUser("Member", UserRole.AGENT, suffix);
    memberPerson = member.person;
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agent.id,
        personId: memberPerson.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );

    const pending = await createUser("Pending", UserRole.AGENT, suffix);
    pendingPerson = pending.person;
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agent.id,
        personId: pendingPerson.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
        status: AgentMembershipStatus.PENDING,
      }),
    );

    const nonMember = await createUser("NonMember", UserRole.AGENT, suffix);
    const plainUser = await createUser("Plain", UserRole.USER, suffix);
    const coordinator = await createUser(
      "Coordinator",
      UserRole.COORDINATOR,
      suffix,
    );
    const admin = await createUser("Admin", UserRole.ADMIN, suffix);

    otherAgent = await fastify.db.agentRepository.save(
      new Agent({ title: `Test Other Agent ${suffix}` }),
    );
    const otherAgentMember = await createUser(
      "OtherAgentMember",
      UserRole.AGENT,
      suffix,
    );
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: otherAgent.id,
        personId: otherAgentMember.person.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );

    const noPerson = await createUserWithoutPerson(
      "NoPerson",
      UserRole.AGENT,
      suffix,
    );

    memberCookie = await login(member.email);
    pendingCookie = await login(pending.email);
    nonMemberCookie = await login(nonMember.email);
    plainUserCookie = await login(plainUser.email);
    coordinatorCookie = await login(coordinator.email);
    adminCookie = await login(admin.email);
    otherAgentMemberCookie = await login(otherAgentMember.email);
    noPersonCookie = await login(noPerson.email);
  });

  afterAll(async () => {
    await fastify.db.agentPersonRepository.delete({ agentId: agent.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.db.agentPersonRepository.delete({ agentId: otherAgent.id });
    await fastify.db.agentRepository.delete({ id: otherAgent.id });
    for (const personId of personIds) {
      await fastify.db.userRepository.delete({ personId });
      await fastify.db.personRepository.delete({ id: personId });
    }
    for (const userId of orphanUserIds) {
      await fastify.db.userRepository.delete({ id: userId });
    }
    await fastify.close();
  });

  it("rejects an unauthenticated request", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agent.id}`,
      payload: { title: "Nope" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects a plain USER-role caller", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agent.id}`,
      cookies: { [accessCookieName]: plainUserCookie },
      payload: { title: "Nope" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("rejects an AGENT-role caller with no membership at this agent", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agent.id}`,
      cookies: { [accessCookieName]: nonMemberCookie },
      payload: { title: "Nope" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("rejects an AGENT-role caller with only a PENDING membership", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agent.id}`,
      cookies: { [accessCookieName]: pendingCookie },
      payload: { title: "Nope" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("rejects an AGENT-role caller who is only an ACTIVE member of a different agent", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agent.id}`,
      cookies: { [accessCookieName]: otherAgentMemberCookie },
      payload: { title: "Nope" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("rejects an AGENT-role caller with no linked person", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agent.id}`,
      cookies: { [accessCookieName]: noPersonCookie },
      payload: { title: "Nope" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("404s for a nonexistent agent id even with a valid AGENT-role caller", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/999999999`,
      cookies: { [accessCookieName]: memberCookie },
      payload: { title: "Nope" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("allows an AGENT-role caller with an ACTIVE membership to edit org details", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agent.id}`,
      cookies: { [accessCookieName]: memberCookie },
      payload: { title: `Updated by member ${agent.id}` },
    });
    expect(res.statusCode).toBe(204);

    const updated = await fastify.db.agentRepository.findOneByOrFail({
      id: agent.id,
    });
    expect(updated.title).toBe(`Updated by member ${agent.id}`);
  });

  it("allows a COORDINATOR to edit org details regardless of membership", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agent.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { title: `Updated by coordinator ${agent.id}` },
    });
    expect(res.statusCode).toBe(204);
  });

  it("allows an ADMIN to edit org details regardless of membership", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agent.id}`,
      cookies: { [accessCookieName]: adminCookie },
      payload: { title: `Updated by admin ${agent.id}` },
    });
    expect(res.statusCode).toBe(204);
  });

  // Regression test for be#843: the operator (Träger, e.g. IB/DRK/Albatros)
  // field on an agent's profile is Agent.organizationId, which was missing
  // end-to-end from the PATCH contract and so silently failed to save.
  it("saves organizationId — the operator (Träger) field (be#843)", async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    const addressRepository = dataSource.getRepository(Address);
    const organizationRepository = dataSource.getRepository(Organization);

    const address = await addressRepository.save(
      new Address({ postcodeId: postcode.id }),
    );
    const organization = await organizationRepository.save(
      new Organization({
        title: `Test Operator ${suffix}`,
        addressId: address.id,
        personId: memberPerson.id,
      }),
    );

    const res = await fastify.inject({
      method: "PATCH",
      url: `/agent/${agent.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: { organizationId: organization.id },
    });
    expect(res.statusCode).toBe(204);

    const updated = await fastify.db.agentRepository.findOneByOrFail({
      id: agent.id,
    });
    expect(updated.organizationId).toBe(organization.id);

    // organizationId is a no-cascade FK on Agent — clear it before deleting
    // the Organization row, or the delete violates the constraint.
    await fastify.db.agentRepository.update(
      { id: agent.id },
      { organizationId: null },
    );
    await organizationRepository.delete({ id: organization.id });
    await addressRepository.delete({ id: address.id });
  });

  // District must always be derived from postcode, never independently
  // settable — a client-supplied districtId that disagrees with the actual
  // postcode is silently overridden rather than persisted (be#827).
  describe("district derivation from postcode", () => {
    let postcodeA: Postcode;
    let postcodeB: Postcode;
    let districtA: District;
    let districtB: District;
    let mappingA: DistrictPostcode;
    let mappingB: DistrictPostcode;

    beforeAll(async () => {
      const districtRepository = dataSource.getRepository(District);
      const postcodeRepository = dataSource.getRepository(Postcode);
      const districtPostcodeRepository =
        dataSource.getRepository(DistrictPostcode);

      const districtSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      const numericSuffix = String(Date.now() % 10000).padStart(4, "0");

      postcodeA = await postcodeRepository.save(
        new Postcode({ value: `1${numericSuffix}` }),
      );
      postcodeB = await postcodeRepository.save(
        new Postcode({ value: `9${numericSuffix}` }),
      );
      districtA = await districtRepository.save(
        new District({ title: `Test District A ${districtSuffix}` }),
      );
      districtB = await districtRepository.save(
        new District({ title: `Test District B ${districtSuffix}` }),
      );
      mappingA = await districtPostcodeRepository.save(
        new DistrictPostcode({
          postcodeId: postcodeA.id,
          districtId: districtA.id,
        }),
      );
      mappingB = await districtPostcodeRepository.save(
        new DistrictPostcode({
          postcodeId: postcodeB.id,
          districtId: districtB.id,
        }),
      );
    });

    afterAll(async () => {
      const districtRepository = dataSource.getRepository(District);
      const postcodeRepository = dataSource.getRepository(Postcode);
      const districtPostcodeRepository =
        dataSource.getRepository(DistrictPostcode);

      // The tests below leave agent.districtId/addressId pointing at the
      // fixtures created here — clear both first. Otherwise deleting the
      // districts violates the agent -> district FK directly, and deleting
      // the postcodes cascades into the address row still referenced by
      // agent.addressId (also a no-cascade FK).
      await fastify.db.agentRepository.update(
        { id: agent.id },
        { districtId: null, addressId: null },
      );
      await districtPostcodeRepository.delete({ id: mappingA.id });
      await districtPostcodeRepository.delete({ id: mappingB.id });
      await districtRepository.delete({ id: districtA.id });
      await districtRepository.delete({ id: districtB.id });
      await postcodeRepository.delete({ id: postcodeA.id });
      await postcodeRepository.delete({ id: postcodeB.id });
    });

    it("derives district from postcode when creating an address via PATCH", async () => {
      const res = await fastify.inject({
        method: "PATCH",
        url: `/agent/${agent.id}`,
        cookies: { [accessCookieName]: coordinatorCookie },
        payload: {
          addressStreet: "Teststraße 1",
          addressPostcode: postcodeA.value,
        },
      });
      expect(res.statusCode).toBe(204);

      const updated = await fastify.db.agentRepository.findOneByOrFail({
        id: agent.id,
      });
      expect(updated.districtId).toBe(districtA.id);
    });

    it("recomputes district when the postcode changes on a subsequent PATCH", async () => {
      const res = await fastify.inject({
        method: "PATCH",
        url: `/agent/${agent.id}`,
        cookies: { [accessCookieName]: coordinatorCookie },
        payload: { addressPostcode: postcodeB.value },
      });
      expect(res.statusCode).toBe(204);

      const updated = await fastify.db.agentRepository.findOneByOrFail({
        id: agent.id,
      });
      expect(updated.districtId).toBe(districtB.id);
    });

    it("ignores a client-supplied districtId that disagrees with the resolved postcode", async () => {
      const res = await fastify.inject({
        method: "PATCH",
        url: `/agent/${agent.id}`,
        cookies: { [accessCookieName]: coordinatorCookie },
        payload: {
          addressPostcode: postcodeA.value,
          districtId: districtB.id,
        },
      });
      expect(res.statusCode).toBe(204);

      const updated = await fastify.db.agentRepository.findOneByOrFail({
        id: agent.id,
      });
      // Derived from postcodeA (districtA), not the client-supplied districtB.
      expect(updated.districtId).toBe(districtA.id);
    });

    it("ignores a client-supplied districtId even when the request doesn't touch the address at all", async () => {
      const before = await fastify.db.agentRepository.findOneByOrFail({
        id: agent.id,
      });

      const res = await fastify.inject({
        method: "PATCH",
        url: `/agent/${agent.id}`,
        cookies: { [accessCookieName]: coordinatorCookie },
        payload: {
          districtId: districtB.id,
          title: `District-noop ${agent.id}`,
        },
      });
      expect(res.statusCode).toBe(204);

      const updated = await fastify.db.agentRepository.findOneByOrFail({
        id: agent.id,
      });
      // Still derived from the agent's existing address (postcodeA / districtA
      // from the previous test), unchanged by the districtId in this payload.
      expect(updated.districtId).toBe(before.districtId);
      expect(updated.districtId).not.toBe(districtB.id);
    });
  });
});
