import { FastifyInstance } from "fastify";
import { AgentEngagementStatusType, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Address from "../../../data/entity/location/address.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

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

    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
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

  it("treats LIKE wildcards in the search as plain text", async () => {
    expect(await search(coordinatorCookie, `Search NGO ${suffix}%`)).toEqual(
      [],
    );
  });
});
