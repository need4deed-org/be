import { FastifyInstance } from "fastify";
import {
  LangProficiency,
  LangPurpose,
  LanguageMatch,
  QueryParamsKeys,
  UserRole,
  VolunteerStateEngagementType,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import DealLanguage from "../../../data/entity/m2m/deal-language";
import DealTimeslot from "../../../data/entity/m2m/deal-timeslot";
import Person from "../../../data/entity/person.entity";
import Timeslot from "../../../data/entity/time/timeslot.entity";
import User from "../../../data/entity/user.entity";
import Volunteer from "../../../data/entity/volunteer/volunteer.entity";
import { DealType } from "../../../data/types";
import { getRepository, hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { randomNumericSuffix } from "../../random";
import { firstSeeded } from "../../seeded";

const PASSWORD = "test_password";
type Key = "both" | "germanOnly" | "englishOnly" | "none";

describe("GET /volunteer language match", () => {
  let fastify: FastifyInstance;
  let cookie: string;
  let germanId: number;
  let englishId: number;
  let frenchId: number;
  let mondaySlot: Timeslot;
  const suffix = randomNumericSuffix();
  const search = `LanguageMatch${suffix}`;
  const volunteers = {} as Record<Key, Volunteer>;
  const deals: Deal[] = [];
  const persons: Person[] = [];

  const list = (query = "") =>
    fastify.inject({
      method: "GET",
      url: `/volunteer?filter[search]=${search}&${query}`,
      cookies: { [accessCookieName]: cookie },
    });

  const language = (...ids: number[]) =>
    ids.map((id) => `filter[language][]=${id}`).join("&");
  const mode = (value: LanguageMatch) =>
    `filter[${QueryParamsKeys.LANGUAGE_MATCH}]=${value}`;

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    const postcode = await firstSeeded(fastify.db.postcodeRepository);
    germanId = (
      await fastify.db.languageRepository.findOneByOrFail({ isoCode: "de" })
    ).id;
    englishId = (
      await fastify.db.languageRepository.findOneByOrFail({ isoCode: "en" })
    ).id;
    frenchId = (
      await fastify.db.languageRepository.findOneByOrFail({ isoCode: "fr" })
    ).id;
    mondaySlot = await getRepository(dataSource, Timeslot).save(
      new Timeslot({
        rrule: "FREQ=WEEKLY;BYDAY=MO;",
        start: new Date(2026, 0, 5, 8),
        end: new Date(2026, 0, 5, 11),
      }),
    );

    const languages: Record<Key, number[]> = {
      both: [germanId, englishId, frenchId],
      germanOnly: [germanId, germanId],
      englishOnly: [englishId],
      none: [],
    };
    for (const key of Object.keys(languages) as Key[]) {
      const person = await fastify.db.personRepository.save(
        new Person({ firstName: key, lastName: search }),
      );
      persons.push(person);
      const deal = await fastify.db.dealRepository.save(
        new Deal({ type: DealType.VOLUNTEER, postcodeId: postcode.id }),
      );
      deals.push(deal);
      if (key === "both" || key === "germanOnly") {
        await getRepository(dataSource, DealTimeslot).save(
          new DealTimeslot({ dealId: deal.id, timeslotId: mondaySlot.id }),
        );
      }
      await getRepository(dataSource, DealLanguage).save(
        languages[key].map(
          (languageId, index) =>
            new DealLanguage({
              dealId: deal.id,
              languageId,
              proficiency: LangProficiency.FLUENT,
              purpose:
                index === 0 ? LangPurpose.GENERAL : LangPurpose.TRANSLATION,
            }),
        ),
      );
      volunteers[key] = await fastify.db.volunteerRepository.save(
        new Volunteer({
          dealId: deal.id,
          personId: person.id,
          statusEngagement:
            key === "both"
              ? VolunteerStateEngagementType.ACTIVE
              : VolunteerStateEngagementType.NEW,
        }),
      );
    }

    const coordinator = await fastify.db.personRepository.save(
      new Person({ firstName: "Filter", lastName: `Coordinator${suffix}` }),
    );
    persons.push(coordinator);
    const email = `volunteer-language-filter-${suffix}@test.need4deed.org`;
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
    expect(res.statusCode).toBe(200);
    cookie = res.cookies.find((c) => c.name === accessCookieName)
      ?.value as string;
  });

  afterAll(async () => {
    if (!fastify) {
      return;
    }
    for (const volunteer of Object.values(volunteers)) {
      await fastify.db.volunteerRepository.delete({ id: volunteer.id });
    }
    for (const deal of deals) {
      await fastify.db.dealRepository.delete({ id: deal.id });
    }
    if (mondaySlot) {
      await getRepository(dataSource, Timeslot).delete({ id: mondaySlot.id });
    }
    for (const person of persons) {
      await fastify.db.userRepository.delete({ personId: person.id });
      await fastify.db.personRepository.delete({ id: person.id });
    }
    await fastify.close();
  });

  async function expectMatches(query: string, keys: Key[]) {
    const res = await list(query);
    expect(res.statusCode).toBe(200);
    const { data, count } = res.json<{
      data: { id: number }[];
      count: number;
    }>();
    expect(data.map(({ id }) => id).sort()).toEqual(
      keys.map((key) => volunteers[key].id).sort(),
    );
    expect(count).toBe(keys.length);
  }

  it.each([false, true])(
    "matches any selected language (explicit mode: %s)",
    async (explicitMode) => {
      const query = language(germanId, englishId);
      await expectMatches(
        explicitMode ? `${query}&${mode(LanguageMatch.ANY)}` : query,
        ["both", "germanOnly", "englishOnly"],
      );
    },
  );

  it("matches every selected language, not duplicate rows for one language", async () => {
    await expectMatches(
      `${language(germanId, englishId)}&${mode(LanguageMatch.ALL)}`,
      ["both"],
    );
  });

  it("deduplicates selected languages", async () => {
    await expectMatches(
      `${language(germanId, germanId)}&${mode(LanguageMatch.ALL)}`,
      ["both", "germanOnly"],
    );
  });

  it("supports a single language and composes with engagement", async () => {
    await expectMatches(
      `filter[language]=${germanId}&${mode(LanguageMatch.ALL)}&filter[engagement]=new`,
      ["germanOnly"],
    );
  });

  it("does not restrict results when no languages are selected", async () => {
    await expectMatches(mode(LanguageMatch.ALL), [
      "both",
      "germanOnly",
      "englishOnly",
      "none",
    ]);
  });

  it("combines all language matching with availability", async () => {
    const query = `${language(germanId, englishId)}&${mode(LanguageMatch.ALL)}`;
    await expectMatches(`${query}&filter[availability]=days~Monday`, ["both"]);
    await expectMatches(`${query}&filter[availability]=days~Tuesday`, []);
  });

  it("returns every language in table mode, even those not selected", async () => {
    const res = await list(
      `${language(germanId, englishId)}&${mode(LanguageMatch.ALL)}&listType=table&limit=1`,
    );
    expect(res.statusCode).toBe(200);
    const { data, count } = res.json<{
      data: { id: number; languages: { id: number }[] }[];
      count: number;
    }>();
    expect(count).toBe(1);
    expect(data.map(({ id }) => id)).toEqual([volunteers.both.id]);
    expect(data[0].languages.map(({ id }) => id).sort()).toEqual(
      [germanId, englishId, frenchId].sort(),
    );
  });

  it("rejects invalid language match modes", async () => {
    const res = await list(`filter[${QueryParamsKeys.LANGUAGE_MATCH}]=invalid`);
    expect(res.statusCode).toBe(400);
  });

  it.each([LanguageMatch.ALL, LanguageMatch.ANY])(
    "rejects malformed language identifiers in %s mode",
    async (value) => {
      for (const id of ["invalid", "0", "1234567890"]) {
        const res = await list(`filter[language]=${id}&${mode(value)}`);
        expect(res.statusCode).toBe(400);
      }
    },
  );

  describe("GET /volunteer/districts", () => {
    const get = (url: string) =>
      fastify.inject({
        method: "GET",
        url,
        cookies: { [accessCookieName]: cookie },
      });

    async function aggregateTotal(query: string) {
      const res = await get(`/volunteer/districts?${query}`);
      expect(res.statusCode).toBe(200);
      const { data } = res.json<{
        data: {
          districts: { count: number }[];
          unassignedBerlin: number;
          outsideBerlin: number;
          remote: number;
        };
      }>();
      return (
        data.districts.reduce((sum, { count }) => sum + count, 0) +
        data.unassignedBerlin +
        data.outsideBerlin +
        data.remote
      );
    }

    async function listCount(query: string) {
      const res = await get(`/volunteer?${query}`);
      expect(res.statusCode).toBe(200);
      return res.json<{ count: number }>().count;
    }

    it("applies the language match mode like the list does", async () => {
      const languages = language(germanId, englishId);
      const all = `${languages}&${mode(LanguageMatch.ALL)}`;
      const any = `${languages}&${mode(LanguageMatch.ANY)}`;

      const [allTotal, allCount, anyTotal, anyCount] = await Promise.all([
        aggregateTotal(all),
        listCount(all),
        aggregateTotal(any),
        listCount(any),
      ]);

      expect(allTotal).toBe(allCount);
      expect(anyTotal).toBe(anyCount);
      // germanOnly and englishOnly match ANY but not ALL
      expect(anyTotal - allTotal).toBeGreaterThanOrEqual(2);
    });

    it("rejects invalid language match modes and identifiers", async () => {
      for (const query of [
        `filter[${QueryParamsKeys.LANGUAGE_MATCH}]=invalid`,
        `filter[language]=invalid`,
      ]) {
        const res = await get(`/volunteer/districts?${query}`);
        expect(res.statusCode).toBe(400);
      }
    });
  });
});
