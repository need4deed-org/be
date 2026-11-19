import { FastifyInstance, InjectOptions } from "fastify";
import {
  AgentEngagementStatusType,
  AppreciationStatusType,
  ContactMethodType,
  ContactType,
  EntityTableName,
  UserRole,
  VolunteerStateAppreciationType,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiKeyHeaderName } from "../../../config/constants";
import ApiKey from "../../../data/entity/api-key.entity";
import Comment from "../../../data/entity/comment.entity";
import Communication from "../../../data/entity/communication.entity";
import Deal from "../../../data/entity/deal.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { hashPassword, sha256Hex } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

describe("route handlers identify API-key callers by their DB user", () => {
  let fastify: FastifyInstance | undefined;
  const suffix = randomNumericSuffix();
  const rawApiKey = `n4d_api-key-auth-${suffix}`;
  let person: Person | undefined;
  let keyUser: User | undefined;
  let volunteerPerson: Person | undefined;
  let deal: Deal | undefined;
  let volunteer: Volunteer | undefined;
  let agent: Agent | undefined;

  const server = () => {
    if (!fastify) {
      throw new Error("server not started");
    }
    return fastify;
  };

  const user = () => {
    if (!keyUser) {
      throw new Error("API-key user not created");
    }
    return keyUser;
  };

  const callWithKey = (
    request: Pick<InjectOptions, "method" | "url" | "payload">,
  ) =>
    server().inject({
      ...request,
      headers: { [apiKeyHeaderName]: rawApiKey },
    });

  const saveComment = () =>
    server().db.commentRepository.save(
      new Comment({
        text: `api-key comment ${suffix}`,
        entityType: EntityTableName.VOLUNTEER,
        entityId: volunteer!.id,
        userId: user().id,
      }),
    );

  const saveCommunication = () =>
    server().db.communicationRepository.save(
      new Communication({
        contactType: ContactType.CALL,
        contactMethod: ContactMethodType.PHONE,
        date: new Date(),
        agentId: agent!.id,
        userId: user().id,
      }),
    );

  const communicationPayload = () => ({
    contactType: ContactType.CALL,
    contactMethod: ContactMethodType.PHONE,
    date: new Date().toISOString(),
  });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    person = await fastify.db.personRepository.save(
      new Person({ firstName: "Api", lastName: `Key ${suffix}` }),
    );
    keyUser = await fastify.db.userRepository.save(
      new User({
        email: `api-key-auth-${suffix}@test.need4deed.org`,
        password: await hashPassword("test_password"),
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: person.id,
      }),
    );
    await fastify.db.apiKeyRepository.save(
      new ApiKey({
        label: `api-key-auth-${suffix}`,
        keyHash: sha256Hex(rawApiKey),
        userId: keyUser.id,
      }),
    );

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
      order: { id: "ASC" },
    });
    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Api", lastName: `Volunteer ${suffix}` }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({ dealId: deal.id, personId: volunteerPerson.id }),
    );
    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Api Key Agent ${suffix}`,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );
  });

  afterAll(async () => {
    if (!fastify) {
      return;
    }
    if (keyUser) {
      const userId = keyUser.id;
      await fastify.db.commentRepository.delete({ userId });
      await fastify.db.communicationRepository.delete({ userId });
      await fastify.db.appreciationRepository.delete({ userId });
      await fastify.db.apiKeyRepository.delete({ userId });
      await fastify.db.userRepository.delete({ id: userId });
    }
    if (volunteer) {
      await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    }
    if (deal) {
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
    if (agent) {
      await fastify.db.agentRepository.delete({ id: agent.id });
    }
    for (const p of [person, volunteerPerson]) {
      if (p) {
        await fastify.db.personRepository.delete({ id: p.id });
      }
    }
    await fastify.close();
  });

  it("GET /user/me returns the key's own user", async () => {
    const res = await callWithKey({ method: "GET", url: "/user/me" });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({
      id: user().id,
      email: user().email,
    });
  });

  it("GET /person/:id returns the key user's own person", async () => {
    const res = await callWithKey({
      method: "GET",
      url: `/person/${user().personId}`,
    });

    expect(res.statusCode).toBe(200);
  });

  it("POST /comment attributes the comment to the key's user", async () => {
    const res = await callWithKey({
      method: "POST",
      url: "/comment",
      payload: {
        text: `api-key comment ${suffix}`,
        entityType: EntityTableName.VOLUNTEER,
        entityId: volunteer!.id,
      },
    });

    expect(res.statusCode).toBe(201);
    const stored = await server().db.commentRepository.findOneByOrFail({
      id: res.json().data.id,
    });
    expect(stored.userId).toBe(user().id);
  });

  it("PATCH /comment/:id lets the key's user edit their comment", async () => {
    const comment = await saveComment();
    const res = await callWithKey({
      method: "PATCH",
      url: `/comment/${comment.id}`,
      payload: { text: "edited via api key" },
    });

    expect(res.statusCode).toBe(200);
  });

  it("DELETE /comment/:id lets the key's user delete their comment", async () => {
    const comment = await saveComment();
    const res = await callWithKey({
      method: "DELETE",
      url: `/comment/${comment.id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(
      await server().db.commentRepository.findOneBy({ id: comment.id }),
    ).toBeNull();
  });

  it("POST /volunteer/:id/communication attributes it to the key's user", async () => {
    const res = await callWithKey({
      method: "POST",
      url: `/volunteer/${volunteer!.id}/communication`,
      payload: communicationPayload(),
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().data.userId).toBe(user().id);
  });

  it("POST /agent/:id/communication attributes it to the key's user", async () => {
    const res = await callWithKey({
      method: "POST",
      url: `/agent/${agent!.id}/communication`,
      payload: communicationPayload(),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.userId).toBe(user().id);
  });

  it("PATCH /communication/:id lets the key's user edit their entry", async () => {
    const communication = await saveCommunication();
    const res = await callWithKey({
      method: "PATCH",
      url: `/communication/${communication.id}`,
      payload: { contactType: ContactType.TEXT_EMAIL },
    });

    expect(res.statusCode).toBe(200);
  });

  it("DELETE /communication/:id lets the key's user delete their entry", async () => {
    const communication = await saveCommunication();
    const res = await callWithKey({
      method: "DELETE",
      url: `/communication/${communication.id}`,
    });

    expect(res.statusCode).toBe(200);
  });

  it("POST /volunteer/:id/appreciation attributes it to the key's user", async () => {
    const res = await callWithKey({
      method: "POST",
      url: `/volunteer/${volunteer!.id}/appreciation`,
      payload: {
        title: VolunteerStateAppreciationType.T_SHIRT,
        status: AppreciationStatusType.PENDING,
        dateDue: new Date().toISOString(),
      },
    });

    expect(res.statusCode).toBe(201);
    const stored = await server().db.appreciationRepository.findOneByOrFail({
      id: res.json().data.id,
    });
    expect(stored.userId).toBe(user().id);
  });
});
