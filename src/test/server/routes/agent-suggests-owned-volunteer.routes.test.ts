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
import { In } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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
  | "home"
  | "peer"
  | "closed"
  | "inactivePeer"
  | "private"
  | "dormant";
type Caller = "home" | "peer" | "private" | "dormant" | "coordinator";
type VolunteerKey =
  | "home"
  | "peer"
  | "private"
  | "dormant"
  | "platform"
  | "withdrawn"
  | "inactivePeer";

const AGENTS: Record<
  AgentKey,
  { sharesVolunteers: boolean; inactive?: boolean }
> = {
  home: { sharesVolunteers: true },
  peer: { sharesVolunteers: true },
  closed: { sharesVolunteers: false },
  inactivePeer: { sharesVolunteers: true, inactive: true },
  private: { sharesVolunteers: false },
  dormant: { sharesVolunteers: true, inactive: true },
};

const MEMBERSHIPS: Record<Exclude<Caller, "coordinator">, AgentKey[]> = {
  home: ["home"],
  peer: ["peer", "inactivePeer"],
  private: ["private"],
  dormant: ["dormant"],
};

describe("NGO suggests its own volunteers (be#1316)", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();

  const agents = {} as Record<AgentKey, Agent>;
  const opportunities = {} as Record<AgentKey, Opportunity>;
  const volunteers = {} as Record<VolunteerKey, Volunteer>;
  const persons: Person[] = [];
  const deals: Deal[] = [];
  const cookies = {} as Record<Caller, string>;
  const extraOpportunityIds: number[] = [];
  let suggestionsSent = 0;

  const suggest = (
    as: Caller,
    volunteer: VolunteerKey,
    opportunity: AgentKey,
    status = OpportunityVolunteerStatusType.PENDING,
  ) =>
    fastify.inject({
      method: "POST",
      url: "/opportunity-volunteer",
      cookies: { [accessCookieName]: cookies[as] },
      payload: {
        volunteerId: volunteers[volunteer].id,
        opportunityId: opportunities[opportunity].id,
        status,
      },
    });

  const expectSuggested = async (
    as: Caller,
    volunteer: VolunteerKey,
    opportunity: AgentKey,
  ) => {
    const res = await suggest(as, volunteer, opportunity);
    expect(res.statusCode).toBe(201);
    suggestionsSent += 1;
    await vi.waitFor(() =>
      expect(fastify.notify.emailSuggestion).toHaveBeenCalledTimes(
        suggestionsSent,
      ),
    );
    const match = await fastify.db.opportunityVolunteerRepository.findOneBy({
      volunteerId: volunteers[volunteer].id,
      opportunityId: opportunities[opportunity].id,
    });
    expect(match?.status).toBe(OpportunityVolunteerStatusType.PENDING);
  };

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    vi.spyOn(fastify.notify, "emailSuggestion").mockResolvedValue(undefined);

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });

    for (const [key, { sharesVolunteers, inactive }] of Object.entries(
      AGENTS,
    ) as [AgentKey, (typeof AGENTS)[AgentKey]][]) {
      agents[key] = await fastify.db.agentRepository.save(
        new Agent({
          title: `Suggest Agent ${key} ${suffix}`,
          engagementStatus: inactive
            ? AgentEngagementStatusType.INACTIVE
            : AgentEngagementStatusType.ACTIVE,
          sharesVolunteers,
        }),
      );
      const deal = await fastify.db.dealRepository.save(
        new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
      );
      deals.push(deal);
      opportunities[key] = await fastify.db.opportunityRepository.save(
        new Opportunity({
          title: `Suggest Opportunity ${key} ${suffix}`,
          type: OpportunityType.REGULAR,
          status: OpportunityStatusType.ACTIVE,
          agentId: agents[key].id,
          dealId: deal.id,
        }),
      );
    }

    const pwHash = await hashPassword(PASSWORD);
    for (const caller of [
      "home",
      "peer",
      "private",
      "dormant",
      "coordinator",
    ] as Caller[]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Suggester", lastName: `${caller}${suffix}` }),
      );
      persons.push(person);
      const email = `suggest-${caller}-${suffix}@test.need4deed.org`;
      await fastify.db.userRepository.save(
        new User({
          email,
          password: pwHash,
          role:
            caller === "coordinator" ? UserRole.COORDINATOR : UserRole.AGENT,
          isActive: true,
          personId: person.id,
        }),
      );
      if (caller !== "coordinator") {
        for (const agentKey of MEMBERSHIPS[caller]) {
          await fastify.db.agentPersonRepository.save(
            new AgentPerson({
              agentId: agents[agentKey].id,
              personId: person.id,
              role: AgentRoleType.VOLUNTEER_COORDINATOR,
              status: AgentMembershipStatus.ACTIVE,
            }),
          );
        }
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
      home: agents.home.id,
      peer: agents.peer.id,
      private: agents.private.id,
      dormant: agents.dormant.id,
      platform: null,
      withdrawn: agents.home.id,
      inactivePeer: agents.inactivePeer.id,
    };
    for (const [key, ownerAgentId] of Object.entries(owners) as [
      VolunteerKey,
      number | null,
    ][]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: `Suggested ${key}`, lastName: `${suffix}` }),
      );
      persons.push(person);
      const deal = await fastify.db.dealRepository.save(
        new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
      );
      deals.push(deal);
      volunteers[key] = await fastify.db.volunteerRepository.save(
        new Volunteer({ dealId: deal.id, personId: person.id, ownerAgentId }),
      );
    }
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    const volunteerIds = Object.values(volunteers).map(({ id }) => id);
    await fastify.db.communicationRepository.delete({
      volunteerId: In(volunteerIds),
    });
    await fastify.db.opportunityVolunteerRepository.delete({
      volunteerId: In(volunteerIds),
    });
    await fastify.db.volunteerRepository.delete({ id: In(volunteerIds) });
    await fastify.db.opportunityRepository.delete({
      id: In([
        ...Object.values(opportunities).map(({ id }) => id),
        ...extraOpportunityIds,
      ]),
    });
    await fastify.db.dealRepository.delete({
      id: In(deals.map(({ id }) => id)),
    });
    const personIds = persons.map(({ id }) => id);
    await fastify.db.agentPersonRepository.delete({ personId: In(personIds) });
    await fastify.db.userRepository.delete({ personId: In(personIds) });
    await fastify.db.personRepository.delete({ id: In(personIds) });
    await fastify.db.agentRepository.delete({
      id: In(Object.values(agents).map(({ id }) => id)),
    });
    await fastify.close();
  });

  it("lets an NGO suggest its own volunteer to its own opportunity", async () => {
    await expectSuggested("home", "home", "home");
  });

  it("lets an NGO suggest its own volunteer to a sharing NGO's opportunity when it shares too", async () => {
    await expectSuggested("home", "home", "peer");
  });

  it("lets a non-sharing NGO suggest its own volunteer to its own opportunity", async () => {
    await expectSuggested("private", "private", "private");
  });

  it("404s an opportunity of an NGO that doesn't share", async () => {
    expect((await suggest("home", "home", "closed")).statusCode).toBe(404);
  });

  it("404s an opportunity of an inactive sharing NGO", async () => {
    expect((await suggest("home", "home", "inactivePeer")).statusCode).toBe(
      404,
    );
  });

  it("404s a sharing NGO's opportunity when the volunteer's NGO doesn't share", async () => {
    expect((await suggest("private", "private", "peer")).statusCode).toBe(404);
  });

  it("404s a platform volunteer or another NGO's volunteer", async () => {
    expect((await suggest("home", "platform", "home")).statusCode).toBe(404);
    expect((await suggest("home", "peer", "home")).statusCode).toBe(404);
  });

  it("403s any status other than a suggestion", async () => {
    const res = await suggest(
      "home",
      "home",
      "home",
      OpportunityVolunteerStatusType.MATCHED,
    );
    expect(res.statusCode).toBe(403);
  });

  it("403s members of an inactive NGO", async () => {
    expect((await suggest("dormant", "dormant", "dormant")).statusCode).toBe(
      403,
    );
  });

  it("404s rather than 403s a non-suggestion for a volunteer it can't reach", async () => {
    const res = await suggest(
      "home",
      "peer",
      "home",
      OpportunityVolunteerStatusType.MATCHED,
    );
    expect(res.statusCode).toBe(404);
  });

  it("400s an email note, which only coordinators may add", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/opportunity-volunteer",
      cookies: { [accessCookieName]: cookies.private },
      payload: {
        volunteerId: volunteers.private.id,
        opportunityId: opportunities.private.id,
        status: OpportunityVolunteerStatusType.PENDING,
        emailNote: "Please call me directly.",
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("400s an opportunity that is no longer open", async () => {
    const deal = await fastify.db.dealRepository.save(
      new Deal({
        type: DealType.OPPORTUNITY,
        postcodeId: deals[0].postcodeId,
      }),
    );
    deals.push(deal);
    const past = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Suggest Opportunity past ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.PAST,
        agentId: agents.home.id,
        dealId: deal.id,
      }),
    );
    extraOpportunityIds.push(past.id);
    const res = await fastify.inject({
      method: "POST",
      url: "/opportunity-volunteer",
      cookies: { [accessCookieName]: cookies.home },
      payload: {
        volunteerId: volunteers.home.id,
        opportunityId: past.id,
        status: OpportunityVolunteerStatusType.PENDING,
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("keeps letting a coordinator suggest any volunteer anywhere", async () => {
    await expectSuggested("coordinator", "platform", "closed");
  });

  describe("withdrawing a suggestion to another NGO's opportunity", () => {
    const link = (
      volunteer: VolunteerKey,
      opportunity: AgentKey,
      status: OpportunityVolunteerStatusType,
    ) =>
      fastify.db.opportunityVolunteerRepository.save(
        new OpportunityVolunteer({
          volunteerId: volunteers[volunteer].id,
          opportunityId: opportunities[opportunity].id,
          status,
        }),
      );
    const remove = (as: Caller, id: number) =>
      fastify.inject({
        method: "DELETE",
        url: `/opportunity-volunteer/${id}`,
        cookies: { [accessCookieName]: cookies[as] },
      });

    it("lets the volunteer's NGO remove its pending suggestion, and no other NGO", async () => {
      const { id } = await link(
        "withdrawn",
        "peer",
        OpportunityVolunteerStatusType.PENDING,
      );
      expect((await remove("private", id)).statusCode).toBe(404);
      expect((await remove("home", id)).statusCode).toBe(204);
      expect(
        await fastify.db.opportunityVolunteerRepository.existsBy({ id }),
      ).toBe(false);
    });

    it("404s a pending suggestion on an NGO it can't suggest to", async () => {
      const { id } = await link(
        "home",
        "closed",
        OpportunityVolunteerStatusType.PENDING,
      );
      expect((await remove("home", id)).statusCode).toBe(404);
    });

    it("404s once the other NGO has moved the suggestion on", async () => {
      const { id } = await link(
        "withdrawn",
        "closed",
        OpportunityVolunteerStatusType.MATCHED,
      );
      expect((await remove("home", id)).statusCode).toBe(404);
    });

    it("still lets the opportunity's NGO remove it when the volunteer's NGO is inactive", async () => {
      const { id } = await link(
        "inactivePeer",
        "peer",
        OpportunityVolunteerStatusType.PENDING,
      );
      expect((await remove("peer", id)).statusCode).toBe(204);
    });

    it("403s members of an inactive NGO", async () => {
      const { id } = await link(
        "dormant",
        "peer",
        OpportunityVolunteerStatusType.PENDING,
      );
      expect((await remove("dormant", id)).statusCode).toBe(403);
    });
  });
});
