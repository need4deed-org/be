import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  CommunicationType,
  ContactMethodType,
  ContactType,
  OpportunityStatusType,
  OpportunityType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Communication from "../../../data/entity/communication.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

describe("communication routes", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();

  let agent: Agent;
  let opportunity: Opportunity;
  const persons: Person[] = [];
  let user: User;
  let otherUser: User;
  let cookie: string;
  let adminCookie: string;

  const createUser = async (lastName: string, role: UserRole) => {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Communication", lastName }),
    );
    persons.push(person);
    const email = `communication-${lastName.toLowerCase()}-${suffix}@test.need4deed.org`;
    const created = await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role,
        isActive: true,
        personId: person.id,
      }),
    );
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    const userCookie = res.cookies.find((c) => c.name === accessCookieName)
      ?.value as string;
    return { user: created, cookie: userCookie };
  };

  const createOther = (userId?: number) =>
    fastify.db.communicationRepository.save(
      new Communication({
        agentId: agent.id,
        userId,
        contactType: ContactType.OTHER,
        contactMethod: ContactMethodType.EMAIL,
        communicationType: CommunicationType.STATUS_UPDATE,
      }),
    );

  const patch = (id: number, payload: object, as = cookie) =>
    fastify.inject({
      method: "PATCH",
      url: `/communication/${id}`,
      payload,
      cookies: { [accessCookieName]: as },
    });

  const remove = (id: number, as = cookie) =>
    fastify.inject({
      method: "DELETE",
      url: `/communication/${id}`,
      cookies: { [accessCookieName]: as },
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Communication Agent ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );
    opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Communication Opportunity ${suffix}`,
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        agentId: agent.id,
      }),
    );
    ({ user, cookie } = await createUser("Coordinator", UserRole.COORDINATOR));
    ({ user: otherUser } = await createUser("Other", UserRole.COORDINATOR));
    ({ cookie: adminCookie } = await createUser("Admin", UserRole.ADMIN));
  });

  afterAll(async () => {
    await fastify.db.communicationRepository.delete({ agentId: agent.id });
    await fastify.db.communicationRepository.delete({
      opportunityId: opportunity.id,
    });
    await fastify.db.opportunityRepository.delete({ id: opportunity.id });
    for (const { id } of persons) {
      await fastify.db.userRepository.delete({ personId: id });
      await fastify.db.personRepository.delete({ id });
    }
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.close();
  });

  it("clears communicationType when it's sent as null", async () => {
    const communication = await createOther();

    const res = await patch(communication.id, {
      contactType: ContactType.TEXT_EMAIL,
      communicationType: null,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.communicationType).toBeUndefined();
    const stored = await fastify.db.communicationRepository.findOneByOrFail({
      id: communication.id,
    });
    expect(stored.contactType).toBe(ContactType.TEXT_EMAIL);
    expect(stored.communicationType).toBeNull();
  });

  it.each(["", false, 0])(
    "rejects communicationType %j instead of clearing it",
    async (value) => {
      const communication = await createOther();

      const res = await patch(communication.id, { communicationType: value });

      expect(res.statusCode).toBe(400);
      const stored = await fastify.db.communicationRepository.findOneByOrFail({
        id: communication.id,
      });
      expect(stored.communicationType).toBe(CommunicationType.STATUS_UPDATE);
    },
  );

  it("sets any CommunicationType the sdk defines", async () => {
    const communication = await createOther();

    const res = await patch(communication.id, {
      communicationType: CommunicationType.CGC_APPLICATION_EMAIL,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.communicationType).toBe(
      CommunicationType.CGC_APPLICATION_EMAIL,
    );
  });

  it("keeps communicationType when it's left out", async () => {
    const communication = await createOther();

    const res = await patch(communication.id, {
      contactMethod: ContactMethodType.PHONE,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.communicationType).toBe(
      CommunicationType.STATUS_UPDATE,
    );
    const stored = await fastify.db.communicationRepository.findOneByOrFail({
      id: communication.id,
    });
    expect(stored.contactMethod).toBe(ContactMethodType.PHONE);
    expect(stored.communicationType).toBe(CommunicationType.STATUS_UPDATE);
  });

  it("ignores fields outside ApiCommunicationPatch", async () => {
    const communication = await createOther();

    const res = await patch(communication.id, {
      contactMethod: ContactMethodType.PHONE,
      id: communication.id + 1,
      agentId: null,
      volunteerId: 1,
      userId: 1,
    });

    expect(res.statusCode).toBe(200);
    const stored = await fastify.db.communicationRepository.findOneByOrFail({
      id: communication.id,
    });
    expect(stored.contactMethod).toBe(ContactMethodType.PHONE);
    expect(stored.agentId).toBe(agent.id);
    expect(stored.volunteerId).toBeNull();
    expect(stored.userId).toBeNull();
  });

  it("lets the author edit their own entry", async () => {
    const communication = await createOther(user.id);

    const res = await patch(communication.id, { communicationType: null });

    expect(res.statusCode).toBe(200);
  });

  it("forbids editing another coordinator's entry", async () => {
    const communication = await createOther(otherUser.id);

    const res = await patch(communication.id, { communicationType: null });

    expect(res.statusCode).toBe(403);
    const stored = await fastify.db.communicationRepository.findOneByOrFail({
      id: communication.id,
    });
    expect(stored.communicationType).toBe(CommunicationType.STATUS_UPDATE);
  });

  it("forbids deleting another coordinator's entry", async () => {
    const communication = await createOther(otherUser.id);

    expect((await remove(communication.id)).statusCode).toBe(403);
  });

  it("lets an admin edit and delete another coordinator's entry", async () => {
    const communication = await createOther(otherUser.id);

    const patched = await patch(
      communication.id,
      { communicationType: null },
      adminCookie,
    );
    const removed = await remove(communication.id, adminCookie);

    expect(patched.statusCode).toBe(200);
    expect(removed.statusCode).toBe(200);
  });

  it("edits an entry linked only to an opportunity", async () => {
    const communication = await fastify.db.communicationRepository.save(
      new Communication({
        opportunityId: opportunity.id,
        contactType: ContactType.TEXT_EMAIL,
        contactMethod: ContactMethodType.EMAIL,
        communicationType: CommunicationType.OPPORTUNITY_UPDATED,
      }),
    );

    const res = await patch(communication.id, { communicationType: null });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({ opportunityId: opportunity.id });
    expect(res.json().data).not.toHaveProperty("agentId");
  });

  it("updates the contact date", async () => {
    const communication = await createOther();
    const date = "2026-01-15T09:30:00.000Z";

    const res = await patch(communication.id, { date });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.date).toBe(date);
    const stored = await fastify.db.communicationRepository.findOneByOrFail({
      id: communication.id,
    });
    expect(stored.date.toISOString()).toBe(date);
  });

  it("defaults the contact date to now", async () => {
    const before = Date.now();

    const communication = await createOther();

    const stored = await fastify.db.communicationRepository.findOneByOrFail({
      id: communication.id,
    });
    expect(stored.date.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it("POST /agent/:id/communication stores the given contact date", async () => {
    const date = "2026-02-01T12:00:00.000Z";

    const res = await fastify.inject({
      method: "POST",
      url: `/agent/${agent.id}/communication`,
      payload: {
        contactType: ContactType.CALL,
        contactMethod: ContactMethodType.PHONE,
        date,
      },
      cookies: { [accessCookieName]: cookie },
    });

    expect(res.statusCode).toBe(200);
    const stored = await fastify.db.communicationRepository.findOneByOrFail({
      id: res.json().data.id,
    });
    expect(stored.date.toISOString()).toBe(date);
  });

  it("POST /agent/:id/communication responds with the created entry", async () => {
    const res = await fastify.inject({
      method: "POST",
      url: `/agent/${agent.id}/communication`,
      payload: {
        contactType: ContactType.TEXT_EMAIL,
        contactMethod: ContactMethodType.EMAIL,
        date: new Date().toISOString(),
      },
      cookies: { [accessCookieName]: cookie },
    });

    expect(res.statusCode).toBe(200);
    const { data } = res.json();
    expect(data).toMatchObject({
      contactType: ContactType.TEXT_EMAIL,
      agentId: agent.id,
      userId: user.id,
    });
    expect(data).not.toHaveProperty("communicationType");
    expect(data).not.toHaveProperty("volunteerId");
  });
});
