import { FastifyInstance } from "fastify";
import { EntityTableName, UserRole } from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Comment from "../../../data/entity/comment.entity";
import Deal from "../../../data/entity/deal.entity";
import FieldTranslation from "../../../data/entity/field_translation.entity";
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
  const skillTranslation = `Imkerei-${suffix}`;
  const targetEmail = `target-${suffix}@test.need4deed.org`;
  const targetPhoneDigits = `4930${suffix}`;
  const commentToken = `Komposthaufen-${suffix}`;
  const COORDINATOR_EMAIL = `coordinator-search-${suffix}@test.need4deed.org`;

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
      new Person({
        firstName: "Search",
        lastName: `Target-${suffix}`,
        email: targetEmail,
        phone: `+49 30 ${suffix}`,
      }),
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
    const german = await fastify.db.languageRepository.findOneByOrFail({
      isoCode: "de",
    });
    await getRepository(dataSource, FieldTranslation).save(
      Object.assign(new FieldTranslation(), {
        skillId: skill.id,
        languageId: german.id,
        translation: skillTranslation,
      }),
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
      if (!cookie) {
        throw new Error("login failed");
      }
      return cookie.value;
    };
    coordinatorCookie = await login(UserRole.COORDINATOR, "coordinator");
    userCookie = await login(UserRole.USER, "user");
    await addCoordinatorComment(
      EntityTableName.VOLUNTEER,
      volunteer.id,
      `Mentioned the ${commentToken} on the phone`,
    );
  });

  afterAll(async () => {
    if (!deal) {
      return;
    }
    await getRepository(dataSource, FieldTranslation).delete({
      skillId: skill.id,
    });
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

  it("finds a volunteer by a translated skill title", async () => {
    expect(await search(userCookie, skillTranslation)).toContain(volunteer.id);
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

  it("finds a volunteer by a word in a coordinator comment, for staff only", async () => {
    expect(await search(coordinatorCookie, commentToken)).toEqual([
      volunteer.id,
    ]);
    expect(await search(userCookie, commentToken)).toEqual([]);
  });

  it("finds a volunteer by full name for staff", async () => {
    expect(await search(coordinatorCookie, `Search Target-${suffix}`)).toEqual([
      volunteer.id,
    ]);
  });

  it("finds a volunteer by email and phone digits for staff", async () => {
    expect(await search(coordinatorCookie, targetEmail)).toEqual([
      volunteer.id,
    ]);
    expect(await search(coordinatorCookie, targetPhoneDigits)).toEqual([
      volunteer.id,
    ]);
  });

  it("does not match a hidden volunteer's email or phone for a masked caller", async () => {
    expect(await search(userCookie, targetEmail)).toEqual([]);
    expect(await search(userCookie, targetPhoneDigits)).toEqual([]);
    expect(await search(userCookie, `Search Target-${suffix}`)).toEqual([]);
  });
});
