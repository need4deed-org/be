import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Deal from "../../../data/entity/deal.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

type AgentKey =
  | "owner"
  | "sharing"
  | "sharingOwner"
  | "outsider"
  | "inactiveSharing";
type Caller = AgentKey | "coordinator" | "admin";
type VolunteerKey =
  | "platform"
  | "ownedByOwner"
  | "ownedBySharingOwner"
  | "ownedByOwnerMatchedToOutsider"
  | "ownedByOwnerSuggestedToOutsider"
  | "ownedByMemberlessSharing";

describe("NGO-owned volunteers (be#1056)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();

  const agents = {} as Record<AgentKey, Agent>;
  const volunteers = {} as Record<VolunteerKey, Volunteer>;
  const persons: Person[] = [];
  const deals: Deal[] = [];
  let outsiderOpportunity: Opportunity;
  let memberlessSharing: Agent;
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
      inactiveSharing: true,
    };
    for (const key of Object.keys(sharing) as AgentKey[]) {
      agents[key] = await fastify.db.agentRepository.save(
        new Agent({
          title: `Owner Agent ${key} ${suffix}`,
          engagementStatus:
            key === "inactiveSharing"
              ? AgentEngagementStatusType.INACTIVE
              : AgentEngagementStatusType.ACTIVE,
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
      inactiveSharing: UserRole.AGENT,
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

    memberlessSharing = await fastify.db.agentRepository.save(
      new Agent({
        title: `Owner Agent memberless ${suffix}`,
        engagementStatus: AgentEngagementStatusType.INACTIVE,
        sharesVolunteers: true,
      }),
    );

    const owners: Record<VolunteerKey, number | null> = {
      platform: null,
      ownedByOwner: agents.owner.id,
      ownedBySharingOwner: agents.sharingOwner.id,
      ownedByOwnerMatchedToOutsider: agents.owner.id,
      ownedByOwnerSuggestedToOutsider: agents.owner.id,
      ownedByMemberlessSharing: memberlessSharing.id,
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

    const opportunityDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    deals.push(opportunityDeal);
    outsiderOpportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Outsider Opportunity ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.ACTIVE,
        agentId: agents.outsider.id,
        dealId: opportunityDeal.id,
      }),
    );
    await fastify.db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        opportunityId: outsiderOpportunity.id,
        volunteerId: volunteers.ownedByOwnerMatchedToOutsider.id,
        status: OpportunityVolunteerStatusType.MATCHED,
      }),
    );
    await fastify.db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        opportunityId: outsiderOpportunity.id,
        volunteerId: volunteers.ownedByOwnerSuggestedToOutsider.id,
        status: OpportunityVolunteerStatusType.PENDING,
      }),
    );
  });

  afterAll(async () => {
    await fastify.db.opportunityVolunteerRepository.delete({
      opportunityId: outsiderOpportunity.id,
    });
    await fastify.db.opportunityRepository.delete({
      id: outsiderOpportunity.id,
    });
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
    for (const agent of [...Object.values(agents), memberlessSharing]) {
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

    it("shows another NGO's volunteer, with its owner, once matched to the caller", async () => {
      const res = await getVolunteer(
        "ownedByOwnerMatchedToOutsider",
        "outsider",
      );
      expect(res.statusCode).toBe(200);
      expect(res.json().data.ownerAgentId).toBe(agents.owner.id);
      expect(res.json().data.person.firstName).toBe(
        "VolownedByOwnerMatchedToOutsider",
      );
    });

    it("hides another NGO's volunteer that is only suggested to the caller", async () => {
      expect(
        (await getVolunteer("ownedByOwnerSuggestedToOutsider", "outsider"))
          .statusCode,
      ).toBe(404);
    });

    it("hides other sharing NGOs' volunteers from an inactive sharing NGO", async () => {
      expect(
        (await getVolunteer("ownedBySharingOwner", "inactiveSharing"))
          .statusCode,
      ).toBe(404);
    });

    it("hides the volunteers of a sharing NGO without active members", async () => {
      expect(
        (await getVolunteer("ownedByMemberlessSharing", "sharing")).statusCode,
      ).toBe(404);
    });

    it.each<Caller>(["outsider", "coordinator"])(
      "404s an unknown volunteer id for %s",
      async (as) => {
        const res = await request("GET", "/volunteer/2147483000", as);
        expect(res.statusCode).toBe(404);
      },
    );

    it("shows every volunteer to a coordinator", async () => {
      expect(
        (await getVolunteer("ownedByOwner", "coordinator")).statusCode,
      ).toBe(200);
    });
  });

  it.each(["opportunity-linked", "appreciation"])(
    "404s the %s list of a hidden or unknown volunteer",
    async (subRoute) => {
      for (const id of [volunteers.ownedByOwner.id, 2147483000]) {
        const res = await request(
          "GET",
          `/volunteer/${id}/${subRoute}`,
          "outsider",
        );
        expect(res.statusCode).toBe(404);
      }
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

  describe("GET /volunteer?filter[search]=", () => {
    const search = async (as: Caller) => {
      const res = await request(
        "GET",
        `/volunteer?limit=50&filter[search]=Owner${suffix}`,
        as,
      );
      expect(res.statusCode).toBe(200);
      return res.json().data as {
        id: number;
        ownerAgentId: number | null;
        firstName?: string;
      }[];
    };

    it("finds an NGO's own volunteers by name", async () => {
      const ids = (await search("owner")).map((v) => v.id);
      expect(ids).toEqual(
        expect.arrayContaining([
          volunteers.ownedByOwner.id,
          volunteers.ownedByOwnerMatchedToOutsider.id,
        ]),
      );
    });

    it("finds another NGO's volunteer matched to the caller, with its owner", async () => {
      const found = await search("outsider");
      expect(found.map((v) => v.id)).toEqual([
        volunteers.ownedByOwnerMatchedToOutsider.id,
      ]);
      expect(found[0].ownerAgentId).toBe(agents.owner.id);
    });
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

    it.each(["99999999999", "abc"])(
      "rejects filter[ownerAgent]=%s",
      async (value) => {
        const res = await request(
          "GET",
          `/volunteer?filter[ownerAgent]=${value}`,
          "coordinator",
        );
        expect(res.statusCode).toBe(400);
      },
    );

    it("lists an NGO's own volunteers", async () => {
      expect((await listIds("owner", "owner")).sort()).toEqual(
        [
          volunteers.ownedByOwner.id,
          volunteers.ownedByOwnerMatchedToOutsider.id,
          volunteers.ownedByOwnerSuggestedToOutsider.id,
        ].sort(),
      );
    });

    it("lists another NGO's volunteer matched to the caller", async () => {
      expect(await listIds("owner", "outsider")).toEqual([
        volunteers.ownedByOwnerMatchedToOutsider.id,
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
