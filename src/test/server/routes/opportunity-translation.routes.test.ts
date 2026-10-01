import { FastifyInstance } from "fastify";
import {
  EntityTableName,
  Lang,
  OpportunityType,
  TranslationStatus,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import FieldTranslation from "../../../data/entity/field_translation.entity";
import District from "../../../data/entity/location/district.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import Language from "../../../data/entity/profile/language.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { enqueue } from "../../../services/translation/queue";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "Translation-Test-1!";

// be#1068: opportunity GET routes serve title/info in ?language=, falling
// back to the original, and report originalLanguage.
describe("opportunity routes in the requested language", () => {
  let fastify: FastifyInstance;
  let cookie: string;
  let agent: Agent;
  let person: Person;
  const suffix = randomNumericSuffix();
  const ids = {} as Record<Lang, number>;
  const created: number[] = [];

  // A German opportunity with its English translations queued, and
  // optionally marked done with the given texts.
  async function germanOpportunity(english?: {
    title: string;
    info: string;
  }): Promise<Opportunity> {
    const opportunity = await dataSource.manager.save(
      new Opportunity({
        title: `Kinderbetreuung ${suffix}-${created.length}`,
        info: "Wir suchen Freiwillige",
        type: OpportunityType.REGULAR,
        originalLanguageId: ids[Lang.DE],
        agentId: agent.id,
      }),
    );
    created.push(opportunity.id);
    await enqueue(
      dataSource.manager,
      EntityTableName.OPPORTUNITY,
      opportunity,
      {
        title: opportunity.title,
        info: opportunity.info,
      },
    );
    if (english) {
      for (const [fieldName, translation] of Object.entries(english)) {
        await dataSource.manager.update(
          FieldTranslation,
          { opportunityId: opportunity.id, fieldName },
          { status: TranslationStatus.DONE, translation },
        );
      }
    }
    return opportunity;
  }

  const get = (url: string) =>
    fastify.inject({
      method: "GET",
      url,
      cookies: { [accessCookieName]: cookie },
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    for (const lang of Object.values(Lang)) {
      ids[lang] = (
        await dataSource.manager.findOneByOrFail(Language, { isoCode: lang })
      ).id;
    }

    // An agent with a district: the GET routes then derive and *save* the
    // opportunity's district on the very entity they translate, which is
    // what the "never writes back" test needs.
    const district = await dataSource.manager.findOneOrFail(District, {
      where: {},
    });
    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Translation agent ${suffix}`,
        districtId: district.id,
      }),
    );
    person = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Coordinator" }),
    );
    const email = `coordinator-translation-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
        role: UserRole.COORDINATOR,
        isActive: true,
        personId: person.id,
      }),
    );
    const login = await fastify.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: PASSWORD },
    });
    cookie = login.cookies.find((c) => c.name === accessCookieName)!.value;
  });

  afterAll(async () => {
    if (created.length) {
      await dataSource.manager.delete(Opportunity, created);
    }
    await fastify.db.userRepository.delete({ personId: person.id });
    await fastify.db.personRepository.delete({ id: person.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.close();
  });

  describe("GET /opportunity/:id", () => {
    it("returns the English title and description with ?language=en", async () => {
      const opportunity = await germanOpportunity({
        title: `Childcare ${suffix}`,
        info: "We are looking for volunteers",
      });

      const res = await get(`/opportunity/${opportunity.id}?language=en`);

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toMatchObject({
        title: `Childcare ${suffix}`,
        description: "We are looking for volunteers",
        originalLanguage: "de",
      });
    });

    it("returns the original without ?language= (German default)", async () => {
      const opportunity = await germanOpportunity({
        title: `Childcare ${suffix}`,
        info: "We are looking for volunteers",
      });

      const res = await get(`/opportunity/${opportunity.id}`);

      expect(res.json().data).toMatchObject({
        title: opportunity.title,
        description: opportunity.info,
        originalLanguage: "de",
      });
    });

    it("falls back to the original while the translation is pending", async () => {
      const opportunity = await germanOpportunity();

      const res = await get(`/opportunity/${opportunity.id}?language=en`);

      expect(res.json().data.title).toBe(opportunity.title);
    });

    it("never writes the translation back to the database", async () => {
      // The route saves district updates on the same entity (be#1068).
      const opportunity = await germanOpportunity({
        title: `Childcare ${suffix}`,
        info: "We are looking for volunteers",
      });

      await get(`/opportunity/${opportunity.id}?language=en`);

      const stored = await dataSource.manager.findOneByOrFail(Opportunity, {
        id: opportunity.id,
      });
      // The route did save the entity (district derived from the agent)...
      expect(stored.districtId).toBe(agent.districtId);
      // ...without the translation.
      expect(stored).toMatchObject({
        title: opportunity.title,
        info: opportunity.info,
      });
    });

    it("reports NULL original language as German", async () => {
      const opportunity = await germanOpportunity();
      await dataSource.manager.update(Opportunity, opportunity.id, {
        originalLanguageId: null as unknown as number,
      });

      const res = await get(`/opportunity/${opportunity.id}`);

      expect(res.json().data.originalLanguage).toBe("de");
    });
  });

  describe("GET /opportunity", () => {
    it("returns English titles with ?language=en", async () => {
      const opportunity = await germanOpportunity({
        title: `Childcare list ${suffix}`,
        info: "We are looking for volunteers",
      });

      const res = await get(
        "/opportunity?language=en&limit=120&sortOrder=new-old",
      );

      expect(res.statusCode).toBe(200);
      const entry = res
        .json()
        .data.find((o: { id: number }) => o.id === opportunity.id);
      expect(entry).toMatchObject({
        title: `Childcare list ${suffix}`,
        originalLanguage: "de",
      });
    });
  });
});
