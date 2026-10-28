import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  CommunicationType,
  ContactMethodType,
  ContactType,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Communication from "../../../data/entity/communication.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

describe("PATCH /communication/:id", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();

  let agent: Agent;
  let person: Person;
  let cookie: string;

  const createOther = () =>
    fastify.db.communicationRepository.save(
      new Communication({
        agentId: agent.id,
        contactType: ContactType.OTHER,
        contactMethod: ContactMethodType.EMAIL,
        communicationType: CommunicationType.STATUS_UPDATE,
      }),
    );

  const patch = (id: number, payload: object) =>
    fastify.inject({
      method: "PATCH",
      url: `/communication/${id}`,
      payload,
      cookies: { [accessCookieName]: cookie },
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
    person = await fastify.db.personRepository.save(
      new Person({ firstName: "Communication", lastName: "Coordinator" }),
    );
    const email = `communication-coordinator-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: person.id,
      }),
    );
    const res = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    cookie = res.cookies.find((c) => c.name === accessCookieName)
      ?.value as string;
  });

  afterAll(async () => {
    await fastify.db.communicationRepository.delete({ agentId: agent.id });
    await fastify.db.userRepository.delete({ personId: person.id });
    await fastify.db.personRepository.delete({ id: person.id });
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
    const stored = await fastify.db.communicationRepository.findOneByOrFail({
      id: communication.id,
    });
    expect(stored.contactMethod).toBe(ContactMethodType.PHONE);
    expect(stored.communicationType).toBe(CommunicationType.STATUS_UPDATE);
  });
});
