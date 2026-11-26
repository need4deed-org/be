import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  ApiOpportunityFeedbackGet,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Deal from "../../../data/entity/deal.entity";
import AgentPerson from "../../../data/entity/m2m/agent-person";
import OpportunityVolunteer from "../../../data/entity/m2m/opportunity-volunteer";
import Agent from "../../../data/entity/opportunity/agent.entity";
import OpportunityFeedback from "../../../data/entity/opportunity/opportunity-feedback.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";
import { firstSeeded } from "../../seeded";

const PASSWORD = "test_password";

describe("opportunity feedback", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();

  let agent: Agent;
  let otherAgent: Agent;
  let inactiveAgent: Agent;
  let opportunity: Opportunity;
  let otherOpportunity: Opportunity;
  let inactiveOpportunity: Opportunity;
  const deals: Deal[] = [];
  const persons: Person[] = [];
  const volunteers: Volunteer[] = [];
  const users: Record<string, User> = {};
  const cookies: Record<string, string> = {};

  const url = (opp: Opportunity, feedbackId?: number) =>
    `/opportunity/${opp.id}/feedback${feedbackId ? `/${feedbackId}` : ""}`;

  const post = (who: string, opp: Opportunity, text: string) =>
    fastify.inject({
      method: "POST",
      url: url(opp),
      cookies: { [accessCookieName]: cookies[who] },
      payload: { text },
    });

  const patch = (
    who: string,
    opp: Opportunity,
    feedbackId: number,
    text: string,
  ) =>
    fastify.inject({
      method: "PATCH",
      url: url(opp, feedbackId),
      cookies: { [accessCookieName]: cookies[who] },
      payload: { text },
    });

  const get = (who: string, opp: Opportunity) =>
    fastify.inject({
      method: "GET",
      url: url(opp),
      cookies: { [accessCookieName]: cookies[who] },
    });

  const feedbackOf = (res: { json: () => unknown }) =>
    (res.json() as { data: ApiOpportunityFeedbackGet }).data;

  const listOf = (res: { json: () => unknown }) =>
    (res.json() as { data: ApiOpportunityFeedbackGet[] }).data;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const saveAgent = (
      label: string,
      engagementStatus: AgentEngagementStatusType,
    ) =>
      fastify.db.agentRepository.save(
        new Agent({
          title: `Test Agent (feedback ${label}) ${suffix}`,
          engagementStatus,
        }),
      );
    agent = await saveAgent("main", AgentEngagementStatusType.ACTIVE);
    otherAgent = await saveAgent("other", AgentEngagementStatusType.ACTIVE);
    inactiveAgent = await saveAgent(
      "inactive",
      AgentEngagementStatusType.INACTIVE,
    );

    const postcodeId = (await firstSeeded(fastify.db.postcodeRepository)).id;
    const saveDeal = async (type: DealType) => {
      const deal = await fastify.db.dealRepository.save(
        new Deal({ type, postcodeId }),
      );
      deals.push(deal);
      return deal;
    };
    const savePerson = async (lastName: string) => {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Feedback", lastName }),
      );
      persons.push(person);
      return person;
    };

    const memberPerson = await savePerson("Member");
    const otherMemberPerson = await savePerson("OtherMember");
    for (const [agentId, personId] of [
      [agent.id, memberPerson.id],
      [inactiveAgent.id, memberPerson.id],
      [otherAgent.id, otherMemberPerson.id],
    ]) {
      await fastify.db.agentPersonRepository.save(
        new AgentPerson({
          agentId,
          personId,
          role: AgentRoleType.VOLUNTEER_COORDINATOR,
          status: AgentMembershipStatus.ACTIVE,
        }),
      );
    }

    const saveOpportunity = async (label: string, agentId: number) =>
      fastify.db.opportunityRepository.save(
        new Opportunity({
          title: `Test Opportunity (feedback ${label}) ${suffix}`,
          type: OpportunityType.REGULAR,
          status: OpportunityStatusType.SEARCHING,
          dealId: (await saveDeal(DealType.OPPORTUNITY)).id,
          agentId,
          contactPersonId: memberPerson.id,
        }),
      );
    opportunity = await saveOpportunity("main", agent.id);
    otherOpportunity = await saveOpportunity("other", agent.id);
    inactiveOpportunity = await saveOpportunity("inactive", inactiveAgent.id);

    const pwHash = await hashPassword(PASSWORD);
    const saveUser = async (
      label: string,
      role: UserRole,
      personId: number,
    ) => {
      users[label] = await fastify.db.userRepository.save(
        new User({
          email: `${label}-opp-feedback-${suffix}@test.need4deed.org`,
          password: pwHash,
          role,
          isActive: true,
          personId,
        }),
      );
    };

    const saveVolunteer = async (
      label: string,
      matches: [Opportunity, OpportunityVolunteerStatusType][],
    ) => {
      const person = await savePerson(label);
      const volunteer = await fastify.db.volunteerRepository.save(
        new Volunteer({
          dealId: (await saveDeal(DealType.VOLUNTEER)).id,
          personId: person.id,
          statusEngagement: VolunteerStateEngagementType.AVAILABLE,
        }),
      );
      volunteers.push(volunteer);
      for (const [opp, status] of matches) {
        await fastify.db.opportunityVolunteerRepository.save(
          new OpportunityVolunteer({
            opportunityId: opp.id,
            volunteerId: volunteer.id,
            status,
          }),
        );
      }
      await saveUser(label, UserRole.VOLUNTEER, person.id);
    };

    await saveVolunteer("volunteer", [
      [opportunity, OpportunityVolunteerStatusType.ACTIVE],
      [inactiveOpportunity, OpportunityVolunteerStatusType.ACTIVE],
    ]);
    await saveVolunteer("past-volunteer", [
      [opportunity, OpportunityVolunteerStatusType.PAST],
    ]);
    await saveVolunteer("pending-volunteer", [
      [opportunity, OpportunityVolunteerStatusType.PENDING],
    ]);
    await saveVolunteer("unmatched-volunteer", []);

    await saveUser(
      "coordinator",
      UserRole.COORDINATOR,
      (await savePerson("Coordinator")).id,
    );
    await saveUser("member", UserRole.AGENT, memberPerson.id);
    await saveUser("other-member", UserRole.AGENT, otherMemberPerson.id);

    for (const label of Object.keys(users)) {
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: `${label}-opp-feedback-${suffix}@test.need4deed.org`,
          password: PASSWORD,
        },
      });
      const cookie = res.cookies.find((c) => c.name === accessCookieName);
      if (!cookie) {
        throw new Error(`Login failed for ${label}`);
      }
      cookies[label] = cookie.value;
    }
  });

  afterAll(async () => {
    for (const opp of [opportunity, otherOpportunity, inactiveOpportunity]) {
      await fastify.db.opportunityRepository.delete({ id: opp.id });
    }
    for (const volunteer of volunteers) {
      await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    }
    for (const deal of deals) {
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
    for (const a of [agent, otherAgent, inactiveAgent]) {
      await fastify.db.agentPersonRepository.delete({ agentId: a.id });
    }
    for (const person of persons) {
      await fastify.db.userRepository.delete({ personId: person.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
    for (const a of [agent, otherAgent, inactiveAgent]) {
      await fastify.db.agentRepository.delete({ id: a.id });
    }
    await fastify.close();
  });

  describe("POST /opportunity/:id/feedback", () => {
    it.each(["volunteer", "past-volunteer", "member", "coordinator"])(
      "lets %s write feedback",
      async (who) => {
        const res = await post(who, opportunity, `  From ${who}  `);
        expect(res.statusCode).toBe(201);
        expect(feedbackOf(res)).toMatchObject({
          opportunityId: opportunity.id,
          authorUserId: users[who].id,
          authorRole: users[who].role,
          text: `From ${who}`,
        });
      },
    );

    it("returns the author's name", async () => {
      const res = await post("member", opportunity, "Named");
      expect(feedbackOf(res).authorName).toBe("Feedback Member");
    });

    it.each(["pending-volunteer", "unmatched-volunteer", "other-member"])(
      "forbids %s",
      async (who) => {
        const res = await post(who, opportunity, "Not allowed");
        expect(res.statusCode).toBe(403);
      },
    );

    it("forbids a volunteer matched to another opportunity of the same NGO", async () => {
      const res = await post("volunteer", otherOpportunity, "Not allowed");
      expect(res.statusCode).toBe(403);
    });

    it("rejects blank text", async () => {
      const res = await post("volunteer", opportunity, "   ");
      expect(res.statusCode).toBe(400);
    });

    it("returns 404 for an unknown opportunity", async () => {
      const res = await fastify.inject({
        method: "POST",
        url: "/opportunity/2147483647/feedback",
        cookies: { [accessCookieName]: cookies.coordinator },
        payload: { text: "Nowhere" },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("PATCH /opportunity/:id/feedback/:feedbackId", () => {
    let volunteerFeedback: ApiOpportunityFeedbackGet;

    beforeAll(async () => {
      volunteerFeedback = feedbackOf(
        await post("volunteer", opportunity, "Original"),
      );
    });

    it("lets the author edit their own feedback", async () => {
      const res = await patch(
        "volunteer",
        opportunity,
        volunteerFeedback.id,
        "Edited",
      );
      expect(res.statusCode).toBe(200);
      expect(feedbackOf(res).text).toBe("Edited");

      const stored =
        await fastify.db.opportunityFeedbackRepository.findOneByOrFail({
          id: volunteerFeedback.id,
        });
      expect(stored.text).toBe("Edited");
      expect(stored.updatedAt.getTime()).toBeGreaterThanOrEqual(
        stored.createdAt.getTime(),
      );
    });

    it.each(["coordinator", "member", "past-volunteer"])(
      "forbids %s editing someone else's feedback",
      async (who) => {
        const res = await patch(
          who,
          opportunity,
          volunteerFeedback.id,
          "Hijack",
        );
        expect(res.statusCode).toBe(403);

        const stored =
          await fastify.db.opportunityFeedbackRepository.findOneByOrFail({
            id: volunteerFeedback.id,
          });
        expect(stored.text).not.toBe("Hijack");
      },
    );

    it("returns 404 when the feedback belongs to another opportunity", async () => {
      const res = await patch(
        "coordinator",
        otherOpportunity,
        volunteerFeedback.id,
        "Wrong opportunity",
      );
      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /opportunity/:id/feedback", () => {
    let ownFeedbackIds: number[];

    beforeAll(async () => {
      for (const who of [
        "volunteer",
        "past-volunteer",
        "member",
        "coordinator",
      ]) {
        await post(who, opportunity, `Read check from ${who}`);
      }
      ownFeedbackIds = (
        await fastify.db.opportunityFeedbackRepository.find({
          select: { id: true },
          where: {
            opportunityId: opportunity.id,
            authorUserId: users.volunteer.id,
          },
        })
      ).map(({ id }) => id);
    });

    it.each(["member", "coordinator"])("shows %s all feedback", async (who) => {
      const res = await get(who, opportunity);
      expect(res.statusCode).toBe(200);
      const authors = new Set(listOf(res).map((f) => f.authorUserId));
      for (const author of [
        "volunteer",
        "past-volunteer",
        "member",
        "coordinator",
      ]) {
        expect(authors).toContain(users[author].id);
      }
    });

    it("shows a volunteer only their own feedback", async () => {
      const res = await get("volunteer", opportunity);
      expect(res.statusCode).toBe(200);
      expect(
        listOf(res)
          .map((f) => f.id)
          .sort(),
      ).toEqual([...ownFeedbackIds].sort());
    });

    it.each(["pending-volunteer", "unmatched-volunteer", "other-member"])(
      "forbids %s",
      async (who) => {
        const res = await get(who, opportunity);
        expect(res.statusCode).toBe(403);
      },
    );

    it("masks volunteer names for NGO members of an inactive agent", async () => {
      await post("volunteer", inactiveOpportunity, "From volunteer");
      await post("member", inactiveOpportunity, "From member");

      const res = await get("member", inactiveOpportunity);
      expect(res.statusCode).toBe(200);
      const byRole = Object.fromEntries(
        listOf(res).map((f) => [f.authorRole, f.authorName]),
      );
      expect(byRole[UserRole.VOLUNTEER]).not.toContain("volunteer");
      expect(byRole[UserRole.AGENT]).toBe("Feedback Member");

      const staffView = await get("coordinator", inactiveOpportunity);
      const staffNames = listOf(staffView).map((f) => f.authorName);
      expect(staffNames).toContain("Feedback volunteer");
    });
  });

  it("removes feedback when its opportunity is deleted", async () => {
    const opp = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity (feedback cascade) ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.SEARCHING,
        agentId: agent.id,
      }),
    );
    const saved = await fastify.db.opportunityFeedbackRepository.save(
      new OpportunityFeedback({
        opportunityId: opp.id,
        authorUserId: users.coordinator.id,
        text: "Cascade",
      }),
    );
    await fastify.db.opportunityRepository.delete({ id: opp.id });
    expect(
      await fastify.db.opportunityFeedbackRepository.existsBy({ id: saved.id }),
    ).toBe(false);
  });
});
