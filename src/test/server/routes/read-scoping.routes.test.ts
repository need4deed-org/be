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

const PASSWORD = "test_password";

type Caller = "coordinator" | "member" | "outsider" | "volunteer";

describe("read endpoints are scoped to the caller", () => {
  let fastify: FastifyInstance;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  let agent: Agent;
  let volunteerDeal: Deal;
  let opportunityDeal: Deal;
  let volunteer: Volunteer;
  let opportunity: Opportunity;
  let match: OpportunityVolunteer;
  const persons: Partial<Record<Caller, Person>> = {};
  const cookies: Partial<Record<Caller, string>> = {};

  const get = (url: string, as: Caller) =>
    fastify.inject({
      method: "GET",
      url,
      cookies: { [accessCookieName]: cookies[as] as string },
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Scoping Agent ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );

    const pwHash = await hashPassword(PASSWORD);
    const roles: Record<Caller, UserRole> = {
      coordinator: UserRole.COORDINATOR,
      member: UserRole.AGENT,
      outsider: UserRole.AGENT,
      volunteer: UserRole.VOLUNTEER,
    };
    for (const caller of Object.keys(roles) as Caller[]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Scoping", lastName: caller }),
      );
      persons[caller] = person;
      const email = `scoping-${caller}-${suffix}@test.need4deed.org`;
      await fastify.db.userRepository.save(
        new User({
          email,
          password: pwHash,
          role: roles[caller],
          isActive: true,
          personId: person.id,
        }),
      );
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      cookies[caller] = res.cookies.find(
        (c) => c.name === accessCookieName,
      )?.value;
    }

    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agent.id,
        personId: (persons.member as Person).id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );

    volunteerDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({
        dealId: volunteerDeal.id,
        personId: (persons.volunteer as Person).id,
      }),
    );
    opportunityDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Scoping Opportunity ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        dealId: opportunityDeal.id,
        agentId: agent.id,
      }),
    );
    match = await fastify.db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        opportunityId: opportunity.id,
        volunteerId: volunteer.id,
        status: OpportunityVolunteerStatusType.ACTIVE,
      }),
    );
  });

  afterAll(async () => {
    await fastify.db.opportunityVolunteerRepository.delete({ id: match.id });
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    await fastify.db.dealRepository.delete({ id: opportunityDeal.id });
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    await fastify.db.dealRepository.delete({ id: volunteerDeal.id });
    await fastify.db.agentPersonRepository.delete({ agentId: agent.id });
    for (const person of Object.values(persons)) {
      await fastify.db.userRepository.delete({ personId: person.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.close();
  });

  describe("GET /comment", () => {
    it("403s for a non-staff caller listing all comments", async () => {
      expect((await get("/comment", "volunteer")).statusCode).toBe(403);
      expect((await get("/comment", "member")).statusCode).toBe(403);
    });

    it("lets a non-staff caller fetch the comments tagging them", async () => {
      const personId = (persons.member as Person).id;
      const res = await get(`/comment?taggedPersonId=${personId}`, "member");
      expect(res.statusCode).toBe(200);
    });

    it("403s for a non-staff caller asking for someone else's tags", async () => {
      const otherId = (persons.coordinator as Person).id;
      const res = await get(`/comment?taggedPersonId=${otherId}`, "member");
      expect(res.statusCode).toBe(403);
    });

    it("still lists everything for a coordinator", async () => {
      expect((await get("/comment", "coordinator")).statusCode).toBe(200);
    });
  });

  describe("GET /user", () => {
    it("shows a non-staff caller only staff accounts", async () => {
      const res = await get("/user?limit=120", "member");
      expect(res.statusCode).toBe(200);
      const userRoles = res.json().data.map((u: { role: UserRole }) => u.role);
      expect(
        userRoles.every(
          (r: UserRole) => r === UserRole.COORDINATOR || r === UserRole.ADMIN,
        ),
      ).toBe(true);
    });

    it("gives a non-staff caller nothing for a non-staff role filter", async () => {
      const res = await get(`/user?role=${UserRole.VOLUNTEER}`, "member");
      expect(res.json().data).toEqual([]);
    });
  });

  describe("GET /agent/:id/communication", () => {
    it("lets a member read their own NGO's log", async () => {
      const res = await get(`/agent/${agent.id}/communication`, "member");
      expect(res.statusCode).toBe(200);
    });

    it("404s for an NGO user of another NGO", async () => {
      const res = await get(`/agent/${agent.id}/communication`, "outsider");
      expect(res.statusCode).toBe(404);
    });
  });

  describe("match hours log", () => {
    const url = () => `/opportunity-volunteer/${match.id}/activity-log`;

    it("lets the volunteer and the NGO member read it", async () => {
      expect((await get(url(), "volunteer")).statusCode).toBe(200);
      expect((await get(url(), "member")).statusCode).toBe(200);
    });

    it("404s for an NGO user of another NGO", async () => {
      expect((await get(url(), "outsider")).statusCode).toBe(404);
    });

    it("403s when the volunteer tries to write it", async () => {
      const res = await fastify.inject({
        method: "POST",
        url: url(),
        payload: { date: "2026-10-01", hours: 2 },
        cookies: { [accessCookieName]: cookies.volunteer as string },
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
