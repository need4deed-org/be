import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import Person from "../../../data/entity/person.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

describe("GET /user?search= matches email and full name", () => {
  let fastify: FastifyInstance;
  let adminCookie: string;
  let agentCookie: string;
  let coordinator: User;
  let volunteer: User;
  const suffix = randomNumericSuffix();
  const firstName = `Zelda${suffix}`;
  const lastName = `Quark${suffix}`;
  const createdUserIds: number[] = [];
  const createdPersonIds: number[] = [];

  async function createAccount(
    role: UserRole,
    email: string,
    name: Partial<Person>,
  ) {
    const person = await fastify.db.personRepository.save(new Person(name));
    createdPersonIds.push(person.id);
    const user = await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role,
        isActive: true,
        personId: person.id,
      }),
    );
    createdUserIds.push(user.id);
    return user;
  }

  async function login(email: string): Promise<string> {
    const response = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    const cookie = response.cookies.find(
      ({ name }) => name === accessCookieName,
    );
    if (!cookie) {
      throw new Error("login failed");
    }
    return cookie.value;
  }

  async function searchIds(
    query: Record<string, string>,
    cookie = adminCookie,
  ): Promise<number[]> {
    const response = await fastify.inject({
      method: "GET",
      url: "/user",
      query: { limit: "100", ...query },
      cookies: { [accessCookieName]: cookie },
    });
    expect(response.statusCode, response.body).toBe(200);
    return response.json().data.map((user: { id: number }) => user.id);
  }

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    const admin = await createAccount(
      UserRole.ADMIN,
      `user-search-admin-${suffix}@test.need4deed.org`,
      { firstName: "Admin", lastName: `Search-${suffix}` },
    );
    adminCookie = await login(admin.email);
    const agent = await createAccount(
      UserRole.AGENT,
      `user-search-agent-${suffix}@test.need4deed.org`,
      { firstName: "Agent", lastName: `Search-${suffix}` },
    );
    agentCookie = await login(agent.email);
    coordinator = await createAccount(
      UserRole.COORDINATOR,
      `user-search-${suffix}@test.need4deed.org`,
      { firstName, middleName: "Maria", lastName },
    );
    volunteer = await createAccount(
      UserRole.VOLUNTEER,
      `user-search-vol-${suffix}@test.need4deed.org`,
      { firstName: "Volunteer", lastName: `Search-${suffix}` },
    );
  });

  afterAll(async () => {
    await fastify.db.userRepository.delete(createdUserIds);
    await fastify.db.personRepository.delete(createdPersonIds);
    await fastify.close();
  });

  it.each([
    ["full email", `user-search-${suffix}@test.need4deed.org`],
    ["partial email", `search-${suffix}@test`],
    ["email in another case", `USER-SEARCH-${suffix}@Test.Need4Deed.org`],
    ["full name without the middle name", `${firstName} ${lastName}`],
    ["reversed name", `${lastName} ${firstName}`],
    ["full name with the middle name", `${firstName} Maria ${lastName}`],
    ["one name part", lastName.toLowerCase()],
    ["name plus email part", `${firstName} search-${suffix}@`],
  ])("finds the account by %s", async (_, search) => {
    expect(await searchIds({ search })).toContain(coordinator.id);
  });

  it("requires every word to match", async () => {
    expect(await searchIds({ search: `${firstName} Nomatch` })).not.toContain(
      coordinator.id,
    );
  });

  it("keeps role ANDed with the search", async () => {
    const search = `search-${suffix}`;
    expect(await searchIds({ search, role: UserRole.COORDINATOR })).toContain(
      coordinator.id,
    );
    const agents = await searchIds({ search, role: UserRole.AGENT });
    expect(agents).not.toContain(coordinator.id);
    expect(agents.length).toBeGreaterThan(0);
  });

  it.each(["_", "%"])("treats %s literally", async (wildcard) => {
    expect(
      await searchIds({ search: `user${wildcard}search-${suffix}@` }),
    ).not.toContain(coordinator.id);
  });

  it("does not reveal a volunteer's account to a non-staff caller", async () => {
    expect(
      await searchIds({ search: volunteer.email }, agentCookie),
    ).not.toContain(volunteer.id);
    expect(
      await searchIds({ search: coordinator.email }, agentCookie),
    ).toContain(coordinator.id);
  });
});
