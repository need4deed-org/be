import { FastifyInstance } from "fastify";
import {
  Lang,
  OpportunityLegacyType,
  OpportunityStatusType,
  OpportunityType,
  TranslationStatus,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import FieldTranslation from "../../../data/entity/field_translation.entity";
import Accompanying from "../../../data/entity/opportunity/accompanying.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import Language from "../../../data/entity/profile/language.entity";
import User from "../../../data/entity/user.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { queueOpportunityTranslation } from "../../../server/utils/data/translate-opportunities";
import { sourceHashOf } from "../../../services/translation/queue";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "Translation-Writes-1!";

// be#1068: writing an opportunity queues its title, and its info for
// regular/events, for machine translation in the same transaction.
describe("opportunity writes queue translations", () => {
  let fastify: FastifyInstance;
  let cookie: string;
  let agent: Agent;
  let person: Person;
  let postcodeValue: string;
  const suffix = randomNumericSuffix();
  const ids = {} as Record<Lang, number>;
  const created: number[] = [];
  const createdAgents: number[] = [];
  const deals: number[] = [];
  const accompanyings: number[] = [];

  const rowsOf = (opportunityId: number) =>
    dataSource.manager.find(FieldTranslation, {
      where: { opportunityId },
      order: { fieldName: "ASC" },
    });

  // A regular opportunity with a deal (PATCH needs one).
  async function saved(fields: Partial<Opportunity>): Promise<Opportunity> {
    const postcode = await fastify.db.postcodeRepository.findOneOrFail({
      where: {},
    });
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId: postcode.id }),
    );
    deals.push(deal.id);
    const opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Nachhilfe ${suffix}-${created.length}`,
        info: "Wir suchen Freiwillige",
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        originalLanguageId: ids[Lang.DE],
        agentId: agent.id,
        dealId: deal.id,
        ...fields,
      }),
    );
    created.push(opportunity.id);
    await queueOpportunityTranslation(dataSource.manager, opportunity);
    return opportunity;
  }

  const patch = (id: number, payload: Record<string, unknown>) =>
    fastify.inject({
      method: "PATCH",
      url: `/opportunity/${id}`,
      cookies: { [accessCookieName]: cookie },
      payload,
    });

  const postLegacy = (query: string, title: string) =>
    fastify.inject({
      method: "POST",
      url: `/opportunity/legacy${query}`,
      payload: {
        title,
        opportunity_type: OpportunityLegacyType.VOLUNTEERING,
        vo_information: "Volunteering text",
        volunteers_number: 1,
        category: "",
        category_id: "",
        language: "en",
        languages: [],
        activities: [],
        skills: [],
        rac_address: `Teststrasse-${suffix} 1`,
        rac_plz: postcodeValue,
      },
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    for (const lang of Object.values(Lang)) {
      ids[lang] = (
        await dataSource.manager.findOneByOrFail(Language, { isoCode: lang })
      ).id;
    }
    postcodeValue = (
      await fastify.db.postcodeRepository.findOneOrFail({ where: {} })
    ).value;
    agent = await fastify.db.agentRepository.save(
      new Agent({ title: `Translation writes agent ${suffix}` }),
    );
    person = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Translation writes" }),
    );
    const email = `coordinator-translation-writes-${suffix}@test.need4deed.org`;
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
    for (const id of deals) {
      await fastify.db.dealRepository.delete({ id });
    }
    for (const id of accompanyings) {
      await fastify.db.accompanyingRepository.delete({ id });
    }
    for (const id of createdAgents) {
      await fastify.db.agentRepository.delete({ id });
    }
    await fastify.db.userRepository.delete({ personId: person.id });
    await fastify.db.personRepository.delete({ id: person.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await fastify.close();
  });

  describe("POST /opportunity/legacy", () => {
    async function create(query: string) {
      const title = `Created ${suffix}-${query || "none"}`;
      const res = await postLegacy(query, title);
      expect(res.statusCode).toBe(200);
      const opportunity =
        await fastify.db.opportunityRepository.findOneByOrFail({
          id: res.json().data.id,
        });
      created.push(opportunity.id);
      if (opportunity.agentId) {
        createdAgents.push(opportunity.agentId);
      }
      if (opportunity.dealId) {
        deals.push(opportunity.dealId);
      }
      return opportunity;
    }

    it("takes the original language from ?language= and queues the other one", async () => {
      const opportunity = await create("?language=en");

      expect(opportunity.originalLanguageId).toBe(ids[Lang.EN]);
      const rows = await rowsOf(opportunity.id);
      expect(
        rows.map((row) => [row.fieldName, row.languageId, row.status]),
      ).toEqual([
        ["info", ids[Lang.DE], TranslationStatus.PENDING],
        ["title", ids[Lang.DE], TranslationStatus.PENDING],
      ]);
    });

    it("defaults to German without ?language=", async () => {
      const opportunity = await create("");

      expect(opportunity.originalLanguageId).toBe(ids[Lang.DE]);
      const rows = await rowsOf(opportunity.id);
      expect(rows.map((row) => row.languageId)).toEqual([
        ids[Lang.EN],
        ids[Lang.EN],
      ]);
    });
  });

  describe("PATCH /opportunity/:id", () => {
    it("re-queues only the changed field", async () => {
      const opportunity = await saved({});
      await dataSource.manager.update(
        FieldTranslation,
        { opportunityId: opportunity.id },
        { status: TranslationStatus.DONE, translation: "Done" },
      );

      const res = await patch(opportunity.id, {
        description: "Neue Beschreibung",
      });

      expect(res.statusCode).toBe(204);
      const rows = await rowsOf(opportunity.id);
      expect(rows.map((row) => [row.fieldName, row.status])).toEqual([
        ["info", TranslationStatus.PENDING],
        ["title", TranslationStatus.DONE],
      ]);
      expect(rows[0].sourceHash).toBe(sourceHashOf("Neue Beschreibung"));
    });

    it("drops info translations on a type change to accompanying", async () => {
      // A leftover accompanying row, so the type change needs no details.
      const accompanying = await fastify.db.accompanyingRepository.save(
        new Accompanying({ name: "Writes Test", address: "Writes Street 1" }),
      );
      accompanyings.push(accompanying.id);
      const opportunity = await saved({ accompanyingId: accompanying.id });

      const res = await patch(opportunity.id, {
        opportunity_type: OpportunityType.ACCOMPANYING,
      });

      expect(res.statusCode).toBe(204);
      const rows = await rowsOf(opportunity.id);
      expect(rows.map((row) => row.fieldName)).toEqual(["title"]);
    });
  });

  it("documents ?language= on the write routes", async () => {
    const { paths } = (
      await fastify.inject({ method: "GET", url: "/swagger/json" })
    ).json();
    const languageParam = (path: string, method: string) =>
      (paths[path] ?? paths[path.replace(/\/$/, "")])?.[
        method
      ]?.parameters?.find(
        (p: { in: string; name: string }) =>
          p.in === "query" && p.name === "language",
      );

    for (const [path, method] of [
      ["/opportunity/", "post"],
      ["/opportunity/legacy/", "post"],
      ["/opportunity/{id}", "patch"],
      ["/post/", "post"],
      ["/post/{id}", "patch"],
    ]) {
      expect(languageParam(path, method), `${method} ${path}`).toBeDefined();
    }
  });

  it("never queues an accompanying opportunity's info", async () => {
    const opportunity = await saved({
      type: OpportunityType.ACCOMPANYING,
      info: "Appointment text",
    });

    const rows = await rowsOf(opportunity.id);
    expect(rows.map((row) => row.fieldName)).toEqual(["title"]);
  });
});
