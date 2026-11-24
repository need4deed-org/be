import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
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
import Agent from "../../../data/entity/opportunity/agent.entity";
import OpportunityAuditLog, {
  OpportunityAuditLogType,
} from "../../../data/entity/opportunity/opportunity-audit-log.entity";
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

describe("opportunity profile changes", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();

  let agent: Agent;
  let otherAgent: Agent;
  const deals: Deal[] = [];
  const persons: Person[] = [];
  const opportunities: Opportunity[] = [];
  let volunteer: Volunteer;
  let memberPerson: Person;
  let contactPerson: Person;
  let coordinatorUser: User;
  let coordinatorCookie: string;
  let memberCookie: string;
  let otherMemberCookie: string;
  let volunteerCookie: string;

  const createOpportunity = async (label: string) => {
    const deal = await fastify.db.dealRepository.save(
      new Deal({
        type: DealType.OPPORTUNITY,
        postcodeId: (await firstSeeded(fastify.db.postcodeRepository)).id,
      }),
    );
    deals.push(deal);
    const opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity (audit ${label}) ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        dealId: deal.id,
        agentId: agent.id,
        contactPersonId: memberPerson.id,
      }),
    );
    opportunities.push(opportunity);
    return opportunity;
  };

  const entriesOf = (
    opportunity: Opportunity,
    type?: OpportunityAuditLogType,
  ) =>
    fastify.db.opportunityAuditLogRepository.find({
      where: { opportunityId: opportunity.id, type },
      order: { id: "ASC" },
    });

  const patch = (opportunity: Opportunity, payload: object) =>
    fastify.inject({
      method: "PATCH",
      url: `/opportunity/${opportunity.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload,
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Test Agent (audit) ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );
    otherAgent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Test Agent (audit other) ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );

    const person = async (lastName: string) => {
      const saved = await fastify.db.personRepository.save(
        new Person({ firstName: "Test", lastName }),
      );
      persons.push(saved);
      return saved;
    };
    memberPerson = await person("Member");
    contactPerson = await person("Contact");
    const otherMemberPerson = await person("OtherMember");
    const coordinatorPerson = await person("Coordinator");
    const volunteerPerson = await person("Volunteer");

    for (const [agentId, personId] of [
      [agent.id, memberPerson.id],
      [agent.id, contactPerson.id],
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

    const volunteerDeal = await fastify.db.dealRepository.save(
      new Deal({
        type: DealType.VOLUNTEER,
        postcodeId: (await firstSeeded(fastify.db.postcodeRepository)).id,
      }),
    );
    deals.push(volunteerDeal);
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({
        dealId: volunteerDeal.id,
        personId: volunteerPerson.id,
        statusEngagement: VolunteerStateEngagementType.AVAILABLE,
      }),
    );

    const pwHash = await hashPassword(PASSWORD);
    const user = (label: string, role: UserRole, personId: number) =>
      fastify.db.userRepository.save(
        new User({
          email: `${label}-opp-audit-${suffix}@test.need4deed.org`,
          password: pwHash,
          role,
          isActive: true,
          personId,
        }),
      );
    coordinatorUser = await user(
      "coordinator",
      UserRole.COORDINATOR,
      coordinatorPerson.id,
    );
    await user("member", UserRole.AGENT, memberPerson.id);
    await user("other-member", UserRole.AGENT, otherMemberPerson.id);
    await user("volunteer", UserRole.VOLUNTEER, volunteerPerson.id);

    const login = async (label: string): Promise<string> => {
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          email: `${label}-opp-audit-${suffix}@test.need4deed.org`,
          password: PASSWORD,
        },
      });
      return getCookie(res.cookies, accessCookieName);
    };
    coordinatorCookie = await login("coordinator");
    memberCookie = await login("member");
    otherMemberCookie = await login("other-member");
    volunteerCookie = await login("volunteer");
  });

  afterAll(async () => {
    await fastify.db.opportunityVolunteerRepository.delete({
      volunteerId: volunteer.id,
    });
    for (const opportunity of opportunities) {
      await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    }
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    for (const deal of deals) {
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
    await fastify.db.agentPersonRepository.delete({ agentId: agent.id });
    await fastify.db.agentPersonRepository.delete({ agentId: otherAgent.id });
    for (const person of persons) {
      await fastify.db.userRepository.delete({ personId: person.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.db.agentRepository.delete({ id: otherAgent.id });
    await fastify.close();
  });

  describe("PATCH /opportunity/:id", () => {
    it("logs one status-changed entry with the acting user", async () => {
      const opportunity = await createOpportunity("status");

      const res = await patch(opportunity, {
        statusOpportunity: OpportunityStatusType.SEARCHING,
      });
      expect(res.statusCode).toBe(204);

      const entries = await entriesOf(opportunity);
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        type: "status-changed",
        actorUserId: coordinatorUser.id,
      });
      expect(entries[0].detail).toBe(
        `Status changed from ${OpportunityStatusType.NEW} to ${OpportunityStatusType.SEARCHING}.`,
      );
    });

    it("logs one details-changed entry when a detail field changes", async () => {
      const opportunity = await createOpportunity("details");

      const res = await patch(opportunity, {
        numberVolunteers: opportunity.numberVolunteers + 1,
      });
      expect(res.statusCode).toBe(204);

      const entries = await entriesOf(opportunity);
      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe("details-changed");
    });

    it("logs one contact-changed entry when the contact person changes", async () => {
      const opportunity = await createOpportunity("contact");

      const res = await patch(opportunity, {
        contact: { id: contactPerson.id },
      });
      expect(res.statusCode).toBe(204);

      const entries = await entriesOf(opportunity);
      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe("contact-changed");
    });

    it("logs one ngo-changed entry when the opportunity moves to another NGO", async () => {
      const opportunity = await createOpportunity("ngo");

      const res = await patch(opportunity, { agent: { id: otherAgent.id } });
      expect(res.statusCode).toBe(204);

      const ngoEntries = await entriesOf(opportunity, "ngo-changed");
      expect(ngoEntries).toHaveLength(1);
      expect(ngoEntries[0].detail).toBe(
        `NGO changed from ${agent.title} (id:${agent.id}) to ${otherAgent.title} (id:${otherAgent.id}).`,
      );
      expect(await entriesOf(opportunity, "details-changed")).toHaveLength(0);
    });

    it("logs nothing when the patch round-trips the current values", async () => {
      const opportunity = await createOpportunity("noop");

      const res = await patch(opportunity, {
        title: opportunity.title,
        statusOpportunity: opportunity.status,
        numberVolunteers: opportunity.numberVolunteers,
        contact: { id: memberPerson.id },
      });
      expect(res.statusCode).toBe(204);

      expect(await entriesOf(opportunity)).toHaveLength(0);
    });
  });

  describe("/opportunity-volunteer", () => {
    it("logs one match-changed entry per match change", async () => {
      const opportunity = await createOpportunity("match");

      const created = await fastify.inject({
        method: "POST",
        url: "/opportunity-volunteer",
        cookies: { [accessCookieName]: coordinatorCookie },
        payload: {
          opportunityId: opportunity.id,
          volunteerId: volunteer.id,
          status: OpportunityVolunteerStatusType.MATCHED,
        },
      });
      expect(created.statusCode).toBe(201);
      const match =
        await fastify.db.opportunityVolunteerRepository.findOneByOrFail({
          opportunityId: opportunity.id,
          volunteerId: volunteer.id,
        });

      const patched = await fastify.inject({
        method: "PATCH",
        url: `/opportunity-volunteer/${match.id}`,
        cookies: { [accessCookieName]: coordinatorCookie },
        payload: { status: OpportunityVolunteerStatusType.ACTIVE },
      });
      expect(patched.statusCode).toBe(204);

      const removed = await fastify.inject({
        method: "DELETE",
        url: `/opportunity-volunteer/${match.id}`,
        cookies: { [accessCookieName]: coordinatorCookie },
      });
      expect(removed.statusCode).toBe(204);

      const entries = await entriesOf(opportunity);
      expect(entries.map(({ type }) => type)).toEqual([
        "match-changed",
        "match-changed",
        "match-changed",
      ]);
      expect(entries.map(({ detail }) => detail)).toEqual([
        `Volunteer #${volunteer.id} linked as ${OpportunityVolunteerStatusType.MATCHED}.`,
        `Volunteer #${volunteer.id} match status changed from ${OpportunityVolunteerStatusType.MATCHED} to ${OpportunityVolunteerStatusType.ACTIVE}.`,
        `Volunteer #${volunteer.id} removed (was ${OpportunityVolunteerStatusType.ACTIVE}).`,
      ]);
      expect(
        entries.every(({ actorUserId }) => actorUserId === coordinatorUser.id),
      ).toBe(true);
    });
  });

  describe("GET /opportunity/:id/audit-log", () => {
    let opportunity: Opportunity;
    let older: OpportunityAuditLog;
    let newer: OpportunityAuditLog;

    beforeAll(async () => {
      opportunity = await createOpportunity("read");
      [older, newer] = await fastify.db.opportunityAuditLogRepository.save([
        new OpportunityAuditLog({
          opportunityId: opportunity.id,
          type: "details-changed",
          detail: "Details updated.",
          occurredAt: new Date(Date.now() - 60_000),
        }),
        new OpportunityAuditLog({
          opportunityId: opportunity.id,
          type: "status-changed",
          detail: "Status changed from new to searching.",
          occurredAt: new Date(),
        }),
      ]);
    });

    const read = (cookie?: string, id = opportunity.id) =>
      fastify.inject({
        method: "GET",
        url: `/opportunity/${id}/audit-log`,
        cookies: cookie ? { [accessCookieName]: cookie } : {},
      });

    it("lets staff read the entries, newest first", async () => {
      const res = await read(coordinatorCookie);
      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.map((entry: { id: number }) => entry.id)).toEqual([
        newer.id,
        older.id,
      ]);
      expect(data[0]).toMatchObject({
        opportunityId: opportunity.id,
        type: "status-changed",
        actorUserId: null,
      });
    });

    it("lets a member of the opportunity's NGO read the entries", async () => {
      const res = await read(memberCookie);
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(2);
    });

    it("blocks a member of another NGO", async () => {
      expect((await read(otherMemberCookie)).statusCode).toBe(403);
    });

    it("blocks a volunteer", async () => {
      expect((await read(volunteerCookie)).statusCode).toBe(403);
    });

    it("rejects an anonymous caller", async () => {
      expect((await read()).statusCode).toBe(401);
    });

    it("returns 404 for an unknown opportunity", async () => {
      expect((await read(coordinatorCookie, 2_000_000_000)).statusCode).toBe(
        404,
      );
    });
  });
});
