import { FastifyInstance } from "fastify";
import { UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import Postcode from "../../../data/entity/location/postcode.entity";
import DealSkill from "../../../data/entity/m2m/deal-skill";
import Person from "../../../data/entity/person.entity";
import Skill from "../../../data/entity/profile/skill.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "test_password";

describe("GET /volunteer search across profile fields", () => {
  let fastify: FastifyInstance;
  let coordinatorCookie: string;
  let userCookie: string;
  let volunteer: Volunteer;
  let deal: Deal;
  let skill: Skill;
  const persons: Person[] = [];
  const suffix = randomNumericSuffix();
  const skillTitle = `Beekeeping-${suffix}`;
  const aboutToken = `Lindenhof-${suffix}`;

  const search = async (cookie: string, q: string) => {
    const res = await fastify.inject({
      method: "GET",
      url: `/volunteer?filter[search]=${encodeURIComponent(q)}`,
      cookies: { [accessCookieName]: cookie },
    });
    expect(res.statusCode).toBe(200);
    return (res.json().data as { id: number }[]).map(({ id }) => id);
  };

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();

    const volunteerPerson = await fastify.db.personRepository.save(
      new Person({ firstName: "Search", lastName: `Target-${suffix}` }),
    );
    persons.push(volunteerPerson);
    const postcode = await getRepository(dataSource, Postcode).findOneByOrFail({
      value: "10115",
    });
    deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
    );
    volunteer = await fastify.db.volunteerRepository.save(
      new Volunteer({
        dealId: deal.id,
        personId: volunteerPerson.id,
        infoAbout: `Grew up near ${aboutToken}`,
      }),
    );
    skill = await getRepository(dataSource, Skill).save(
      new Skill({ title: skillTitle }),
    );
    await getRepository(dataSource, DealSkill).save(
      new DealSkill({ dealId: deal.id, skillId: skill.id }),
    );

    const pwHash = await hashPassword(PASSWORD);
    const login = async (role: UserRole, label: string) => {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: "Search", lastName: label }),
      );
      persons.push(person);
      const email = `${label}-search-${suffix}@test.need4deed.org`;
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
      if (!cookie) throw new Error("login failed");
      return cookie.value;
    };
    coordinatorCookie = await login(UserRole.COORDINATOR, "coordinator");
    userCookie = await login(UserRole.USER, "user");
  });

  afterAll(async () => {
    if (!deal) return;
    await getRepository(dataSource, DealSkill).delete({ dealId: deal.id });
    await getRepository(dataSource, Skill).delete({ id: skill.id });
    await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    await fastify.db.dealRepository.delete({ id: deal.id });
    for (const person of persons) {
      await fastify.db.userRepository.delete({ personId: person.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
    await fastify.close();
  });

  it("finds a volunteer by one of their skills", async () => {
    expect(await search(coordinatorCookie, skillTitle.toLowerCase())).toEqual([
      volunteer.id,
    ]);
  });

  it("finds a volunteer by their about text for staff", async () => {
    expect(await search(coordinatorCookie, aboutToken)).toEqual([volunteer.id]);
  });

  it("does not search the about text for a masked caller", async () => {
    expect(await search(userCookie, aboutToken)).toEqual([]);
  });

  it("still finds a volunteer by skill for a masked caller", async () => {
    expect(await search(userCookie, skillTitle)).toContain(volunteer.id);
  });
});
