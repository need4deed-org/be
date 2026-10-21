import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  AgentMembershipStatus,
  AgentRoleType,
  EMAIL_NOTE_MAX_LENGTH,
  OpportunityMatchStatusType,
  OpportunityStatusType,
  OpportunityType,
  OpportunityVolunteerStatusType,
  UserRole,
  VolunteerStateEngagementType,
  VolunteerStateMatchType,
} from "need4deed-sdk";
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

describe("DELETE /opportunity-volunteer/:id", () => {
  let fastify: FastifyInstance;

  let deal: Deal;
  let volunteerPerson: Person;
  let volunteer: Volunteer;
  let opportunityDeal: Deal;
  let opportunity: Opportunity;
  let opportunityVolunteer: OpportunityVolunteer;
  let agentPerson: Person;
  let coordinatorPerson: Person;
  let agentCookie: string;
  let coordinatorCookie: string;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });

    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Volunteer" }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: volunteerPerson.id }),
    );

    opportunityDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity (unmatch via m2m route) ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        dealId: opportunityDeal.id,
      }),
    );
    opportunityVolunteer = await fastify.db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        opportunityId: opportunity.id,
        volunteerId: volunteer.id,
        status: OpportunityVolunteerStatusType.MATCHED,
      }),
    );
    // Set explicitly so the "before" state for the recompute assertion below
    // doesn't depend on what OpportunityVolunteerSubscriber computed on insert.
    await fastify.db.volunteerRepository.update(
      { id: volunteer.id },
      { statusMatch: VolunteerStateMatchType.MATCHED },
    );
    await fastify.db.opportunityRepository.update(
      { id: opportunity.id },
      { statusMatch: OpportunityMatchStatusType.MATCHED },
    );

    agentPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Agent" }),
    );
    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );

    const pwHash = await hashPassword(PASSWORD);
    await fastify.db.userRepository.save(
      new User({
        email: `agent-m2m-unmatch-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.AGENT,
        isActive: true,
        personId: agentPerson.id,
      }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: `coordinator-m2m-unmatch-${suffix}@test.need4deed.org`,
        password: pwHash,
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );

    const login = async (email: string): Promise<string> => {
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      return getCookie(res.cookies, accessCookieName);
    };

    agentCookie = await login(`agent-m2m-unmatch-${suffix}@test.need4deed.org`);
    coordinatorCookie = await login(
      `coordinator-m2m-unmatch-${suffix}@test.need4deed.org`,
    );
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete({ personId: agentPerson.id });
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: agentPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    // The match link is deleted by the DELETE call itself in the test below;
    // this is best-effort in case a test fails before reaching that point.
    await fastify.db.opportunityVolunteerRepository.delete({
      id: opportunityVolunteer.id,
    });
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.personRepository.delete({ id: volunteerPerson.id });
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    await fastify.db.dealRepository.delete({ id: opportunityDeal.id });
    await fastify.close();
  });

  it("404s when an NGO user who isn't a member of the opportunity's NGO tries to remove the link", async () => {
    const res = await fastify.inject({
      method: "DELETE",
      url: `/opportunity-volunteer/${opportunityVolunteer.id}`,
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("404s a status change by an NGO user who isn't a member, whatever the status", async () => {
    const res = await fastify.inject({
      method: "PATCH",
      url: `/opportunity-volunteer/${opportunityVolunteer.id}`,
      payload: { status: OpportunityVolunteerStatusType.PENDING },
      cookies: { [accessCookieName]: agentCookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("404s for a nonexistent m2m relation", async () => {
    const res = await fastify.inject({
      method: "DELETE",
      url: `/opportunity-volunteer/999999999`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("removes the link and recomputes statusMatch on both the volunteer and opportunity sides", async () => {
    const res = await fastify.inject({
      method: "DELETE",
      url: `/opportunity-volunteer/${opportunityVolunteer.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
    });
    expect(res.statusCode).toBe(204);

    expect(
      await fastify.db.opportunityVolunteerRepository.findOneBy({
        id: opportunityVolunteer.id,
      }),
    ).toBeNull();

    // Regression for be#808: repository.delete() never fires the
    // OpportunityVolunteer entity's @AfterRemove hook, so both sides'
    // statusMatch must be recomputed explicitly by the route handler —
    // otherwise they stay frozen at MATCHED forever.
    const survivingVolunteer = await fastify.db.volunteerRepository.findOneBy({
      id: volunteer.id,
    });
    expect(survivingVolunteer?.statusMatch).toBe(
      VolunteerStateMatchType.NEEDS_REMATCH,
    );

    const survivingOpportunity =
      await fastify.db.opportunityRepository.findOneBy({
        id: opportunity.id,
      });
    expect(survivingOpportunity?.statusMatch).toBe(
      OpportunityMatchStatusType.NEEDS_REMATCH,
    );
  });
});

describe("NGO member changing a match on their own opportunity", () => {
  let fastify: FastifyInstance;

  let agent: Agent;
  let deal: Deal;
  let volunteerPerson: Person;
  let volunteer: Volunteer;
  let opportunityDeal: Deal;
  let opportunity: Opportunity;
  let opportunityVolunteer: OpportunityVolunteer;
  let memberPerson: Person;
  let volunteerUserPerson: Person;
  let memberUserId: number;
  let memberCookie: string;
  let volunteerCookie: string;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });

    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Test Agent (m2m member) ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );
    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Volunteer" }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({
        dealId: deal.id,
        personId: volunteerPerson.id,
        statusEngagement: VolunteerStateEngagementType.AVAILABLE,
      }),
    );
    opportunityDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity (m2m member) ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        dealId: opportunityDeal.id,
        agentId: agent.id,
      }),
    );
    opportunityVolunteer = await fastify.db.opportunityVolunteerRepository.save(
      new OpportunityVolunteer({
        opportunityId: opportunity.id,
        volunteerId: volunteer.id,
        status: OpportunityVolunteerStatusType.MATCHED,
      }),
    );

    memberPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Member" }),
    );
    volunteerUserPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "VolunteerUser" }),
    );
    await fastify.db.agentPersonRepository.save(
      new AgentPerson({
        agentId: agent.id,
        personId: memberPerson.id,
        role: AgentRoleType.VOLUNTEER_COORDINATOR,
        status: AgentMembershipStatus.ACTIVE,
      }),
    );

    const pwHash = await hashPassword(PASSWORD);
    const memberEmail = `agent-m2m-member-${suffix}@test.need4deed.org`;
    const volunteerEmail = `volunteer-m2m-member-${suffix}@test.need4deed.org`;
    const memberUser = await fastify.db.userRepository.save(
      new User({
        email: memberEmail,
        password: pwHash,
        role: UserRole.AGENT,
        isActive: true,
        personId: memberPerson.id,
      }),
    );
    await fastify.db.userRepository.save(
      new User({
        email: volunteerEmail,
        password: pwHash,
        role: UserRole.VOLUNTEER,
        isActive: true,
        personId: volunteerUserPerson.id,
      }),
    );

    const login = async (email: string): Promise<string> => {
      const res = await fastify.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email, password: PASSWORD },
      });
      return getCookie(res.cookies, accessCookieName);
    };
    memberUserId = memberUser.id;
    memberCookie = await login(memberEmail);
    volunteerCookie = await login(volunteerEmail);
  });

  afterAll(async () => {
    await fastify.db.agentPersonRepository.delete({ agentId: agent.id });
    for (const person of [memberPerson, volunteerUserPerson]) {
      await fastify.db.userRepository.delete({ personId: person.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
    await fastify.db.opportunityVolunteerRepository.delete({
      id: opportunityVolunteer.id,
    });
    await fastify.db.volunteerAuditLogRepository.delete({
      volunteerId: volunteer.id,
    });
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.personRepository.delete({ id: volunteerPerson.id });
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    await fastify.db.dealRepository.delete({ id: opportunityDeal.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.close();
  });

  const patchStatus = (
    status: OpportunityVolunteerStatusType,
    cookie: string,
  ) =>
    fastify.inject({
      method: "PATCH",
      url: `/opportunity-volunteer/${opportunityVolunteer.id}`,
      payload: { status },
      cookies: { [accessCookieName]: cookie },
    });

  it("403s when the NGO member skips matching (Pending straight to Active)", async () => {
    await fastify.db.opportunityVolunteerRepository.update(
      { id: opportunityVolunteer.id },
      { status: OpportunityVolunteerStatusType.PENDING },
    );
    try {
      const res = await patchStatus(
        OpportunityVolunteerStatusType.ACTIVE,
        memberCookie,
      );
      expect(res.statusCode).toBe(403);
    } finally {
      await fastify.db.opportunityVolunteerRepository.update(
        { id: opportunityVolunteer.id },
        { status: OpportunityVolunteerStatusType.MATCHED },
      );
    }
  });

  it("403s when the NGO member sets a status other than Active or Past", async () => {
    const res = await patchStatus(
      OpportunityVolunteerStatusType.PENDING,
      memberCookie,
    );
    expect(res.statusCode).toBe(403);
  });

  it("403s for a volunteer", async () => {
    const res = await patchStatus(
      OpportunityVolunteerStatusType.ACTIVE,
      volunteerCookie,
    );
    expect(res.statusCode).toBe(403);
  });

  it("lets the NGO member mark the match Active, and the volunteer becomes Active", async () => {
    const res = await patchStatus(
      OpportunityVolunteerStatusType.ACTIVE,
      memberCookie,
    );
    expect(res.statusCode).toBe(204);

    const ov = await fastify.db.opportunityVolunteerRepository.findOneBy({
      id: opportunityVolunteer.id,
    });
    expect(ov?.status).toBe(OpportunityVolunteerStatusType.ACTIVE);

    const changes = await fastify.db.volunteerAuditLogRepository.find({
      where: { volunteerId: volunteer.id, type: "opportunity_status_changed" },
    });
    const activated = changes.find((e) =>
      e.detail.includes(`to ${OpportunityVolunteerStatusType.ACTIVE}`),
    );
    expect(activated?.detail).toContain(opportunity.title);
    expect(activated?.actorUserId).toBe(memberUserId);
    const updated = await fastify.db.volunteerRepository.findOneBy({
      id: volunteer.id,
    });
    expect(updated?.statusEngagement).toBe(VolunteerStateEngagementType.ACTIVE);
  });

  it("lets the NGO member mark the match Past, and the volunteer is Available again", async () => {
    const res = await patchStatus(
      OpportunityVolunteerStatusType.PAST,
      memberCookie,
    );
    expect(res.statusCode).toBe(204);

    const updated = await fastify.db.volunteerRepository.findOneBy({
      id: volunteer.id,
    });
    expect(updated?.statusEngagement).toBe(
      VolunteerStateEngagementType.AVAILABLE,
    );
  });

  it("403s when the NGO member removes a Past match", async () => {
    const res = await fastify.inject({
      method: "DELETE",
      url: `/opportunity-volunteer/${opportunityVolunteer.id}`,
      cookies: { [accessCookieName]: memberCookie },
    });
    expect(res.statusCode).toBe(403);
  });

  it("403s for members of an inactive NGO", async () => {
    await fastify.db.agentRepository.update(
      { id: agent.id },
      { engagementStatus: AgentEngagementStatusType.INACTIVE },
    );
    try {
      const res = await patchStatus(
        OpportunityVolunteerStatusType.ACTIVE,
        memberCookie,
      );
      expect(res.statusCode).toBe(403);
    } finally {
      await fastify.db.agentRepository.update(
        { id: agent.id },
        { engagementStatus: AgentEngagementStatusType.ACTIVE },
      );
    }
  });

  it("lets the NGO member remove the match", async () => {
    await fastify.db.opportunityVolunteerRepository.update(
      { id: opportunityVolunteer.id },
      { status: OpportunityVolunteerStatusType.MATCHED },
    );
    const res = await fastify.inject({
      method: "DELETE",
      url: `/opportunity-volunteer/${opportunityVolunteer.id}`,
      cookies: { [accessCookieName]: memberCookie },
    });
    expect(res.statusCode).toBe(204);
    expect(
      await fastify.db.opportunityVolunteerRepository.findOneBy({
        id: opportunityVolunteer.id,
      }),
    ).toBeNull();

    const entries = await fastify.db.volunteerAuditLogRepository.find({
      where: { volunteerId: volunteer.id, type: "opportunity_status_changed" },
      order: { id: "ASC" },
    });
    expect(entries[0].detail).toContain("Linked to opportunity");
    expect(entries.at(-1)?.detail).toContain("Removed from opportunity");
    expect(entries.at(-1)?.actorUserId).toBe(memberUserId);
  });
});

describe("coordinator's email note on suggest / match", () => {
  let fastify: FastifyInstance;

  let deal: Deal;
  let volunteerPerson: Person;
  let volunteer: Volunteer;
  let opportunityDeal: Deal;
  let opportunity: Opportunity;
  let coordinatorPerson: Person;
  let coordinatorCookie: string;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });

    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Volunteer" }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: volunteerPerson.id }),
    );
    opportunityDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Opportunity (email note) ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        dealId: opportunityDeal.id,
      }),
    );

    coordinatorPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    const email = `coordinator-m2m-note-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinatorPerson.id,
      }),
    );
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    coordinatorCookie = getCookie(res.cookies, accessCookieName);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await fastify.db.userRepository.delete({ personId: coordinatorPerson.id });
    await fastify.db.personRepository.delete({ id: coordinatorPerson.id });
    await fastify.db.opportunityVolunteerRepository.delete({
      opportunityId: opportunity.id,
    });
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    await fastify.db.personRepository.delete({ id: volunteerPerson.id });
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    await fastify.db.dealRepository.delete({ id: opportunityDeal.id });
    await fastify.close();
  });

  it("400s a note over EMAIL_NOTE_MAX_LENGTH characters", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/opportunity-volunteer",
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        opportunityId: opportunity.id,
        volunteerId: volunteer.id,
        status: OpportunityVolunteerStatusType.PENDING,
        emailNote: "x".repeat(EMAIL_NOTE_MAX_LENGTH + 1),
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("passes the note to the suggestion and then the introduction email", async () => {
    const suggestion = vi
      .spyOn(fastify.notify, "emailSuggestion")
      .mockResolvedValue(undefined);
    const introduction = vi
      .spyOn(fastify.notify, "emailIntroduction")
      .mockResolvedValue(undefined);

    const created = await fastify.inject({
      method: "POST",
      url: "/opportunity-volunteer",
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        opportunityId: opportunity.id,
        volunteerId: volunteer.id,
        status: OpportunityVolunteerStatusType.PENDING,
        emailNote: "Suggest note",
      },
    });
    expect(created.statusCode).toBe(201);
    await vi.waitFor(() =>
      expect(suggestion).toHaveBeenCalledWith(
        expect.objectContaining({ volunteerId: volunteer.id }),
        "Suggest note",
      ),
    );

    const ov = await fastify.db.opportunityVolunteerRepository.findOneByOrFail({
      opportunityId: opportunity.id,
      volunteerId: volunteer.id,
    });
    const matched = await fastify.inject({
      method: "PATCH",
      url: `/opportunity-volunteer/${ov.id}`,
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        status: OpportunityVolunteerStatusType.MATCHED,
        emailNote: "Match note",
      },
    });
    expect(matched.statusCode).toBe(204);
    await vi.waitFor(() =>
      expect(introduction).toHaveBeenCalledWith(
        expect.objectContaining({ id: ov.id }),
        "Match note",
      ),
    );
    expect(
      (
        await fastify.db.opportunityVolunteerRepository.findOneByOrFail({
          id: ov.id,
        })
      ).status,
    ).toBe(OpportunityVolunteerStatusType.MATCHED);
  });

  it("rejects a note that no email would carry, leaving the match unchanged", async () => {
    const ov = await fastify.db.opportunityVolunteerRepository.findOneByOrFail({
      opportunityId: opportunity.id,
      volunteerId: volunteer.id,
    });
    const patch = (payload: Record<string, unknown>) =>
      fastify.inject({
        method: "PATCH",
        url: `/opportunity-volunteer/${ov.id}`,
        cookies: { [accessCookieName]: coordinatorCookie },
        payload,
      });

    expect(
      (
        await patch({
          status: OpportunityVolunteerStatusType.MATCHED,
          emailNote: "Same status",
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await patch({
          status: OpportunityVolunteerStatusType.ACTIVE,
          emailNote: "No email for active",
        })
      ).statusCode,
    ).toBe(400);
    const alreadySent = await patch({
      status: OpportunityVolunteerStatusType.PENDING,
      emailNote: "Suggestion already sent",
    });
    expect(alreadySent.statusCode).toBe(409);
    expect(alreadySent.json().message).toContain("already sent");
    expect((await patch({ emailNote: "No status" })).statusCode).toBe(400);
    expect(
      (
        await fastify.db.opportunityVolunteerRepository.findOneByOrFail({
          id: ov.id,
        })
      ).status,
    ).toBe(OpportunityVolunteerStatusType.MATCHED);

    expect(
      (await patch({ status: OpportunityVolunteerStatusType.ACTIVE }))
        .statusCode,
    ).toBe(204);
  });

  it("400s a note on a POST that creates a match without a suggestion email", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/opportunity-volunteer",
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        opportunityId: opportunity.id,
        volunteerId: volunteer.id + 1_000_000,
        status: OpportunityVolunteerStatusType.MATCHED,
        emailNote: "Nobody gets this",
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("reports an existing match before judging the note", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/opportunity-volunteer",
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        opportunityId: opportunity.id,
        volunteerId: volunteer.id,
        status: OpportunityVolunteerStatusType.PENDING,
        emailNote: "Again",
      },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("ConflictError");
  });

  it("400s a POST without opportunityId or volunteerId", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/opportunity-volunteer",
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        opportunityId: opportunity.id,
        status: OpportunityVolunteerStatusType.PENDING,
        emailNote: "Missing volunteer",
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("400s a note with {{ … }}, which the email validator would hold back", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: "/opportunity-volunteer",
      cookies: { [accessCookieName]: coordinatorCookie },
      payload: {
        opportunityId: opportunity.id,
        volunteerId: volunteer.id + 1_000_000,
        status: OpportunityVolunteerStatusType.PENDING,
        emailNote: "Bitte {{ Datum }} bestätigen",
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("ignores an id in the POST body instead of overwriting that match", async () => {
    const existing =
      await fastify.db.opportunityVolunteerRepository.findOneByOrFail({
        opportunityId: opportunity.id,
        volunteerId: volunteer.id,
      });
    const otherDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: deal.postcodeId }),
    );
    const otherPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Other", lastName: "Volunteer" }),
    );
    const otherVolunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: otherDeal.id, personId: otherPerson.id }),
    );
    try {
      const res = await fastify.inject({
        method: "POST",
        url: "/opportunity-volunteer",
        cookies: { [accessCookieName]: coordinatorCookie },
        payload: {
          id: existing.id,
          opportunityId: opportunity.id,
          volunteerId: otherVolunteer.id,
          status: OpportunityVolunteerStatusType.MATCHED,
        },
      });
      expect(res.statusCode).toBe(201);
      expect(
        (
          await fastify.db.opportunityVolunteerRepository.findOneByOrFail({
            id: existing.id,
          })
        ).volunteerId,
      ).toBe(volunteer.id);
    } finally {
      await fastify.db.opportunityVolunteerRepository.delete({
        volunteerId: otherVolunteer.id,
      });
      await fastify.db.volunteerRepository.delete({ id: otherVolunteer.id });
      await fastify.db.dealRepository.delete({ id: otherDeal.id });
      await fastify.db.personRepository.delete({ id: otherPerson.id });
    }
  });

  it("502s when the email with the note fails, and doesn't record it as sent", async () => {
    const otherDeal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: deal.postcodeId }),
    );
    const otherPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Unlucky", lastName: "Volunteer" }),
    );
    const otherVolunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: otherDeal.id, personId: otherPerson.id }),
    );
    vi.spyOn(fastify.notify, "emailSuggestion").mockRejectedValueOnce(
      new Error("SMTP down"),
    );
    try {
      const res = await fastify.inject({
        method: "POST",
        url: "/opportunity-volunteer",
        cookies: { [accessCookieName]: coordinatorCookie },
        payload: {
          opportunityId: opportunity.id,
          volunteerId: otherVolunteer.id,
          status: OpportunityVolunteerStatusType.PENDING,
          emailNote: "Lost?",
        },
      });

      expect(res.statusCode).toBe(502);
      expect(res.json().message).toContain("email with your note was not sent");
      expect(
        await fastify.db.opportunityVolunteerRepository.findOneBy({
          opportunityId: opportunity.id,
          volunteerId: otherVolunteer.id,
        }),
      ).not.toBeNull();
      expect(
        await fastify.db.communicationRepository.exists({
          where: {
            opportunityId: opportunity.id,
            volunteerId: otherVolunteer.id,
          },
        }),
      ).toBe(false);
    } finally {
      await fastify.db.opportunityVolunteerRepository.delete({
        volunteerId: otherVolunteer.id,
      });
      await fastify.db.volunteerRepository.delete({ id: otherVolunteer.id });
      await fastify.db.dealRepository.delete({ id: otherDeal.id });
      await fastify.db.personRepository.delete({ id: otherPerson.id });
    }
  });
  it("sends the accompanying match note only to the agent", async () => {
    const accompanyingOpportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Test Accompanying (email note) ${Date.now()}`,
        type: OpportunityType.ACCOMPANYING,
        status: OpportunityStatusType.NEW,
        dealId: opportunityDeal.id,
      }),
    );
    const agentEmail = vi
      .spyOn(fastify.notify, "emailAccompanyMatch")
      .mockResolvedValue(undefined);
    const volunteerEmail = vi
      .spyOn(fastify.notify, "emailAccompanyMatchVolunteer")
      .mockResolvedValue(undefined);

    try {
      const ov = await fastify.db.opportunityVolunteerRepository.save(
        new OpportunityVolunteer({
          opportunityId: accompanyingOpportunity.id,
          volunteerId: volunteer.id,
          status: OpportunityVolunteerStatusType.PENDING,
        }),
      );

      const res = await fastify.inject({
        method: "PATCH",
        url: `/opportunity-volunteer/${ov.id}`,
        cookies: { [accessCookieName]: coordinatorCookie },
        payload: {
          status: OpportunityVolunteerStatusType.MATCHED,
          emailNote: "Agent note",
        },
      });

      expect(res.statusCode).toBe(204);
      expect(agentEmail).toHaveBeenCalledWith(
        expect.objectContaining({ id: ov.id }),
        "Agent note",
      );
      expect(volunteerEmail).toHaveBeenCalledTimes(1);
      expect(volunteerEmail.mock.calls[0]).toHaveLength(1);
    } finally {
      await fastify.db.communicationRepository.delete({
        opportunityId: accompanyingOpportunity.id,
      });
      await fastify.db.opportunityVolunteerRepository.delete({
        opportunityId: accompanyingOpportunity.id,
      });
      await fastify.db.opportunityRepository.delete({
        id: accompanyingOpportunity.id,
      });
    }
  });
});
