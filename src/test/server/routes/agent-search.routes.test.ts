import { FastifyInstance } from "fastify";
import {
  AgentEngagementStatusType,
  EntityTableName,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Comment from "../../../data/entity/comment.entity";
import Address from "../../../data/entity/location/address.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";
import { firstSeeded } from "../../seeded";

const PASSWORD = "test_password";

describe("GET /agent search across profile fields", () => {
  let fastify: FastifyInstance;
  let coordinatorCookie: string;
  let userCookie: string;
  let agent: Agent;
  let address: Address;
  const persons: Person[] = [];
  const suffix = randomNumericSuffix();
  const infoToken = `Kinderzimmer-${suffix}`;
  const street = `Ahornweg-${suffix}`;
  const commentToken = `Hausmeister-${suffix}`;
  const COORDINATOR_EMAIL = `coordinator-agent-search-${suffix}@test.need4deed.org`;

  const addCoordinatorComment = async (
    entityType: EntityTableName,
    entityId: number,
    text: string,
  ) => {
    const author = await fastify.db.userRepository.findOneByOrFail({
      email: COORDINATOR_EMAIL,
    });
    const language = await fastify.db.languageRepository.findOneByOrFail({
      isoCode: "en",
    });
    await getRepository(dataSource, Comment).save(
      new Comment({
        text,
        entityType,
        entityId,
        userId: author.id,
        languageId: language.id,
      }),
    );
  };

  const search = async (cookie: string, q: string) => {
    const res = await fastify.inject({
      method: "GET",
      url: `/agent?filter[search]=${encodeURIComponent(q)}`,
      cookies: { [accessCookieName]: cookie },
    });
    expect(res.statusCode).toBe(200);
    return (res.json().data as { id: number }[]).map(({ id }) => id);
  };

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const postcode = await firstSeeded(fastify.db.postcodeRepository);
    address = await getRepository(dataSource, Address).save(
      new Address({ street, postcodeId: postcode.id }),
    );
    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Search NGO ${suffix}`,
        info: `We run a ${infoToken} for families`,
        addressId: address.id,
        engagementStatus: AgentEngagementStatusType.ACTIVE,
      }),
    );

    const pwHash = await hashPassword(PASSWORD);
    const login = async (role: UserRole, label: string) => {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Search", lastName: label }),
      );
      persons.push(person);
      const email = `${label}-agent-search-${suffix}@test.need4deed.org`;
      await fastify.db.userRepository.save(
        new User({
          email,
          password: pwHash,
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
      const cookie = res.cookies.find((c) => c.name === accessCookieName);
      if (!cookie) {
        throw new Error("login failed");
      }
      return cookie.value;
    };
    coordinatorCookie = await login(UserRole.COORDINATOR, "coordinator");
    userCookie = await login(UserRole.USER, "user");
    await addCoordinatorComment(
      EntityTableName.AGENT,
      agent.id,
      `Ask the ${commentToken} for the key`,
    );
  });

  afterAll(async () => {
    if (!agent) {
      return;
    }
    await fastify.db.agentRepository.delete({ id: agent.id });
    await getRepository(dataSource, Address).delete({ id: address.id });
    for (const person of persons) {
      await fastify.db.userRepository.delete({ personId: person.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
    await fastify.close();
  });

  it("finds an NGO by its description", async () => {
    expect(await search(coordinatorCookie, infoToken)).toEqual([agent.id]);
  });

  it("finds an NGO by its street for staff", async () => {
    expect(await search(coordinatorCookie, street)).toEqual([agent.id]);
  });

  it("does not search the street for a masked caller", async () => {
    expect(await search(userCookie, street)).toEqual([]);
  });

  it("finds an NGO by a word in a coordinator comment, for staff only", async () => {
    expect(await search(coordinatorCookie, commentToken)).toEqual([agent.id]);
    expect(await search(userCookie, commentToken)).toEqual([]);
  });

  it("treats LIKE wildcards in the search as plain text", async () => {
    expect(await search(coordinatorCookie, `Search NGO ${suffix}%`)).toEqual(
      [],
    );
  });
});
