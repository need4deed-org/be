import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Deal from "../../../data/entity/deal.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

type AgentKey = "owner" | "sharing" | "sharingOwner" | "outsider";
type Caller = AgentKey | "coordinator" | "admin";
type VolunteerKey = "platform" | "ownedByOwner" | "ownedBySharingOwner";

describe("NGO-owned volunteers (be#1056)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();

  const agents = {} as Record<AgentKey, Agent>;
  const volunteers = {} as Record<VolunteerKey, Volunteer>;
  const persons: Person[] = [];
  const deals: Deal[] = [];
  const cookies = {} as Record<Caller, string>;

  const request = (
    method: "GET" | "PATCH",
    url: string,
    as: Caller,
    payload?: object,
  ) =>
    fastify.inject({
      method,
      url,
      payload,
      cookies: { [accessCookieName]: cookies[as] },
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    const sharing: Record<AgentKey, boolean> = {
      owner: false,
      sharing: true,
      sharingOwner: true,
      outsider: false,
    };
    for (const key of Object.keys(sharing) as AgentKey[]) {
      agents[key] = await fastify.db.agentRepository.save(
        new Agent({
          title: `Owner Agent ${key} ${suffix}`,
          engagementStatus: AgentEngagementStatusType.ACTIVE,
          sharesVolunteers: sharing[key],
        }),
      );
    }

    const pwHash = await hashPassword(PASSWORD);
    const roles: Record<Caller, UserRole> = {
      owner: UserRole.AGENT,
      sharing: UserRole.AGENT,
      sharingOwner: UserRole.AGENT,
      outsider: UserRole.AGENT,
      coordinator: UserRole.COORDINATOR,
      admin: UserRole.ADMIN,
    };
    for (const caller of Object.keys(roles) as Caller[]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Caller", lastName: caller }),
      );
      persons.push(person);
      const email = `owner-${caller}-${suffix}@test.need4deed.org`;
      await fastify.db.userRepository.save(
        new User({
          email,
          password: pwHash,
          role: roles[caller],
          isActive: true,
          personId: person.id,
        }),
      );
      if (caller in agents) {
        await fastify.db.agentPersonRepository.save(
          new AgentPerson({
            agentId: agents[caller as AgentKey].id,
            personId: person.id,
            role: AgentRoleType.VOLUNTEER_COORDINATOR,
            status: AgentMembershipStatus.ACTIVE,
          }),
        );
      }
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      cookies[caller] = res.cookies.find((c) => c.name === accessCookieName)
        ?.value as string;
    }

    const owners: Record<VolunteerKey, number | null> = {
      platform: null,
      ownedByOwner: agents.owner.id,
      ownedBySharingOwner: agents.sharingOwner.id,
    };
    for (const key of Object.keys(owners) as VolunteerKey[]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: `Vol${key}`, lastName: `Owner${suffix}` }),
      );
      persons.push(person);
      const deal = await fastify.db.dealRepository.save(
        new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
      );
      deals.push(deal);
      volunteers[key] = await fastify.db.volunteerRepository.save(
        new Volunteer({
          dealId: deal.id,
          personId: person.id,
          ownerAgentId: owners[key],
        }),
      );
    }
  });

  afterAll(async () => {
    for (const volunteer of Object.values(volunteers)) {
      await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    }
    for (const deal of deals) {
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
    for (const agent of Object.values(agents)) {
      await fastify.db.agentPersonRepository.delete({ agentId: agent.id });
    }
    for (const person of persons) {
      await fastify.db.userRepository.delete({ personId: person.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
    for (const agent of Object.values(agents)) {
      await fastify.db.agentRepository.delete({ id: agent.id });
    }
    await fastify.close();
  });

  const getVolunteer = (key: VolunteerKey, as: Caller) =>
    request("GET", `/volunteer/${volunteers[key].id}`, as);

  describe("GET /volunteer/:id", () => {
    it("shows the owner NGO its own volunteer unmasked", async () => {
      const res = await getVolunteer("ownedByOwner", "owner");
      expect(res.statusCode).toBe(200);
      expect(res.json().data.ownerAgentId).toBe(agents.owner.id);
      expect(res.json().data.person.firstName).toBe("VolownedByOwner");
    });

    it("hides a non-sharing NGO's volunteer from other NGOs", async () => {
      expect((await getVolunteer("ownedByOwner", "outsider")).statusCode).toBe(
        404,
      );
      expect((await getVolunteer("ownedByOwner", "sharing")).statusCode).toBe(
        404,
      );
    });

    it("shows a sharing NGO's volunteer, masked, to another sharing NGO", async () => {
      const res = await getVolunteer("ownedBySharingOwner", "sharing");
      expect(res.statusCode).toBe(200);
      expect(res.json().data.person.firstName).toMatch(/^[a-z]\*\*\*$/);
    });

    it("hides a sharing NGO's volunteer from an NGO that doesn't share", async () => {
      expect(
        (await getVolunteer("ownedBySharingOwner", "outsider")).statusCode,
      ).toBe(404);
    });

    it("keeps platform volunteers visible and masked for every NGO", async () => {
      const res = await getVolunteer("platform", "outsider");
      expect(res.statusCode).toBe(200);
      expect(res.json().data.ownerAgentId).toBeNull();
      expect(res.json().data.person.firstName).toMatch(/^[a-z]\*\*\*$/);
    });

    it("shows every volunteer to a coordinator", async () => {
      expect(
        (await getVolunteer("ownedByOwner", "coordinator")).statusCode,
      ).toBe(200);
    });
  });

  it.each(["opportunity-linked", "appreciation"])(
    "404s the %s list of a hidden volunteer",
    async (subRoute) => {
      const res = await request(
        "GET",
        `/volunteer/${volunteers.ownedByOwner.id}/${subRoute}`,
        "outsider",
      );
      expect(res.statusCode).toBe(404);
    },
  );

  it("lists need4deed-only volunteers with filter[ownerAgent]=none", async () => {
    const res = await request(
      "GET",
      `/volunteer?limit=50&filter[ownerAgent]=none&filter[search]=Owner${suffix}`,
      "coordinator",
    );
    const ids = (res.json().data as { id: number }[]).map((v) => v.id);
    expect(ids).toContain(volunteers.platform.id);
    expect(ids).not.toContain(volunteers.ownedByOwner.id);
  });

  describe("GET /volunteer?filter[ownerAgent]=", () => {
    const listIds = async (agentKey: AgentKey, as: Caller) => {
      const res = await request(
        "GET",
        `/volunteer?limit=50&filter[ownerAgent]=${agents[agentKey].id}`,
        as,
      );
      expect(res.statusCode).toBe(200);
      return (res.json().data as { id: number }[]).map((v) => v.id);
    };

    it("lists an NGO's own volunteers", async () => {
      expect(await listIds("owner", "owner")).toEqual([
        volunteers.ownedByOwner.id,
      ]);
    });

    it("lists another sharing NGO's volunteers only to a sharing NGO", async () => {
      expect(await listIds("sharingOwner", "sharing")).toEqual([
        volunteers.ownedBySharingOwner.id,
      ]);
      expect(await listIds("sharingOwner", "outsider")).toEqual([]);
      expect(await listIds("owner", "sharing")).toEqual([]);
    });
  });

  describe("PATCH /volunteer/:id ownerAgentId", () => {
    const patchOwner = (as: Caller, ownerAgentId: number | null) =>
      request("PATCH", `/volunteer/${volunteers.platform.id}`, as, {
        ownerAgentId,
      });

    it("rejects an owner change from a coordinator", async () => {
      expect(
        (await patchOwner("coordinator", agents.owner.id)).statusCode,
      ).toBe(403);
    });

    it("lets an admin set and clear the owner", async () => {
      const set = await patchOwner("admin", agents.owner.id);
      expect(set.statusCode).toBe(200);
      expect(set.json().data.ownerAgentId).toBe(agents.owner.id);

      const cleared = await patchOwner("admin", null);
      expect(cleared.statusCode).toBe(200);
      expect(cleared.json().data.ownerAgentId).toBeNull();
    });
  });

  it("lets an NGO member switch sharing on its own agent", async () => {
    const res = await request(
      "PATCH",
      `/agent/${agents.outsider.id}`,
      "outsider",
      {
        sharesVolunteers: true,
      },
    );
    expect(res.statusCode).toBe(204);
    const agent = await request(
      "GET",
      `/agent/${agents.outsider.id}`,
      "outsider",
    );
    expect(agent.json().data.sharesVolunteers).toBe(true);
  });
});
