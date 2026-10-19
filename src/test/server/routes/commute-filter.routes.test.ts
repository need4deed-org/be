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
const LISTS = ["/volunteer", "/opportunity"];

describe("filter[commute-postcode] / filter[max-commute-minutes] on GET /volunteer and GET /opportunity", () => {
  let fastify: FastifyInstance;
  const suffix = randomNumericSuffix();
  let cookie: string;
  let coordinator: Person;

  const get = (url: string) =>
    fastify.inject({
      method: "GET",
      url,
      cookies: { [accessCookieName]: cookie },
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    coordinator = await fastify.db.personRepository.save(
      new Person({ firstName: "Commute", lastName: `Coord${suffix}` }),
    );
    const email = `commute-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: coordinator.id,
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
    await fastify.db.userRepository.delete({ personId: coordinator.id });
    await fastify.db.personRepository.delete({ id: coordinator.id });
    await fastify.close();
  });

  describe.each(LISTS)("GET %s", (list) => {
    it("accepts both keys together", async () => {
      const res = await get(
        `${list}?filter[commute-postcode]=12043&filter[max-commute-minutes]=30`,
      );
      expect(res.statusCode).toBe(200);
    });

    it("accepts them together with a search, which adds its own id condition", async () => {
      const res = await get(
        `${list}?filter[search]=commute&filter[commute-postcode]=12043&filter[max-commute-minutes]=30`,
      );
      expect(res.statusCode).toBe(200);
    });

    it.each([
      ["only commute-postcode", "filter[commute-postcode]=12043"],
      ["only max-commute-minutes", "filter[max-commute-minutes]=30"],
      [
        "a postcode that is not 5 digits",
        "filter[commute-postcode]=1204&filter[max-commute-minutes]=30",
      ],
      [
        "non-integer minutes",
        "filter[commute-postcode]=12043&filter[max-commute-minutes]=half",
      ],
      [
        "zero minutes",
        "filter[commute-postcode]=12043&filter[max-commute-minutes]=0",
      ],
    ])("rejects %s with 400", async (_, query) => {
      const res = await get(`${list}?${query}`);
      expect(res.statusCode).toBe(400);
    });

    it("rejects a postcode that is not in the postcode table with 400", async () => {
      const res = await get(
        `${list}?filter[commute-postcode]=00000&filter[max-commute-minutes]=30`,
      );
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toBe('Unknown commute postcode "00000".');
    });
  });
});
