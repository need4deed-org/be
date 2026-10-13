import { FastifyInstance } from "fastify";
import {
  Lang,
  OpportunityLegacyType,
  OpportunityStatusType,
  OpportunityType,
  TranslationOrigin,
  TranslationStatus,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import Deal from "../../../data/entity/deal.entity";
import FieldTranslation from "../../../data/entity/field_translation.entity";
import Address from "../../../data/entity/location/address.entity";
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
  let address: Address;
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

  const patch = (
    id: number,
    payload: Record<string, unknown>,
    language?: Lang,
  ) =>
    fastify.inject({
      method: "PATCH",
      url: `/opportunity/${id}${language ? `?language=${language}` : ""}`,
      cookies: { [accessCookieName]: cookie },
      payload,
    });

  // The public form and the dashboard form: the body's `language` is the
  // one the text is entered in (be#1104).
  const forms = {
    "POST /opportunity/legacy": (title: string, language?: string) =>
      fastify.inject({
        method: "POST",
        url: "/opportunity/legacy?language=en",
        payload: {
          title,
          opportunity_type: OpportunityLegacyType.VOLUNTEERING,
          vo_information: "Volunteering text",
          volunteers_number: 1,
          category: "",
          category_id: "",
          ...(language !== undefined && { language }),
          languages: [],
          activities: [],
          skills: [],
          rac_address: `Teststrasse-${suffix} 1`,
          rac_plz: postcodeValue,
        },
      }),
    "POST /opportunity": (title: string, language?: string) =>
      fastify.inject({
        method: "POST",
        url: "/opportunity/?language=en",
        cookies: { [accessCookieName]: cookie },
        payload: {
          title,
          agent_id: agent.id,
          opportunity_type: OpportunityLegacyType.VOLUNTEERING,
          vo_information: "Volunteering text",
          volunteers_number: 1,
          category: "",
          category_id: "",
          ...(language !== undefined && { language }),
          languageIds: [],
          activityIds: [],
          skillIds: [],
        },
      }),
  };

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
    // POST /opportunity needs the NGO's address to have a postcode.
    address = await dataSource.manager.save(
      new Address({
        postcodeId: (
          await fastify.db.postcodeRepository.findOneOrFail({ where: {} })
        ).id,
      }),
    );
    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Translation writes agent ${suffix}`,
        addressId: address.id,
      }),
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
    await dataSource.manager.delete(Address, { id: address.id });
    await fastify.close();
  });

  describe.each(Object.keys(forms) as (keyof typeof forms)[])("%s", (form) => {
    async function create(language?: string) {
      const res = await forms[form](
        `Created ${suffix}-${form}-${language ?? "none"}`,
        language,
      );
      expect(res.statusCode).toBeLessThan(300);
      const opportunity =
        await fastify.db.opportunityRepository.findOneByOrFail({
          id: res.json().data.id,
        });
      created.push(opportunity.id);
      if (opportunity.agentId && opportunity.agentId !== agent.id) {
        createdAgents.push(opportunity.agentId);
      }
      if (opportunity.dealId) {
        deals.push(opportunity.dealId);
      }
      return opportunity;
    }

    it("takes the original language from the body and queues the other one", async () => {
      const opportunity = await create("en");

      expect(opportunity.originalLanguageId).toBe(ids[Lang.EN]);
      const rows = await rowsOf(opportunity.id);
      expect(
        rows.map((row) => [row.fieldName, row.languageId, row.status]),
      ).toEqual([
        ["info", ids[Lang.DE], TranslationStatus.PENDING],
        ["title", ids[Lang.DE], TranslationStatus.PENDING],
      ]);
    });

    // The request's ?language=en is ignored: it's the body that counts.
    it("takes German from the body over ?language=en", async () => {
      const opportunity = await create("de");

      expect(opportunity.originalLanguageId).toBe(ids[Lang.DE]);
      const rows = await rowsOf(opportunity.id);
      expect(rows.map((row) => row.languageId)).toEqual([
        ids[Lang.EN],
        ids[Lang.EN],
      ]);
    });

    it.each([
      ["no language", undefined],
      ["an unknown one", "fr"],
    ])("defaults to German with %s", async (_, language) => {
      const opportunity = await create(language);
      expect(opportunity.originalLanguageId).toBe(ids[Lang.DE]);
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

    describe("in another language than the original", () => {
      async function translated() {
        const opportunity = await saved({});
        await dataSource.manager.update(
          FieldTranslation,
          { opportunityId: opportunity.id, fieldName: "title" },
          { status: TranslationStatus.DONE, translation: "Tutoring" },
        );
        return opportunity;
      }

      const stored = (id: number) =>
        fastify.db.opportunityRepository.findOneByOrFail({ id });

      it("stores a human translation and keeps the source", async () => {
        const opportunity = await translated();

        const res = await patch(
          opportunity.id,
          { title: "Homework help", numberVolunteers: 7 },
          Lang.EN,
        );

        expect(res.statusCode).toBe(204);
        const source = await stored(opportunity.id);
        expect(source.title).toBe(opportunity.title);
        expect(source.numberVolunteers).toBe(7);
        const [info, title] = await rowsOf(opportunity.id);
        expect(title).toMatchObject({
          origin: TranslationOrigin.HUMAN,
          status: TranslationStatus.DONE,
          translation: "Homework help",
        });
        expect(info.origin).toBe(TranslationOrigin.MACHINE);
      });

      it("creates no human rows for a full form with unchanged values", async () => {
        const opportunity = await translated();
        const before = await rowsOf(opportunity.id);

        const res = await patch(
          opportunity.id,
          { title: "Tutoring", description: opportunity.info },
          Lang.EN,
        );

        expect(res.statusCode).toBe(204);
        expect(await rowsOf(opportunity.id)).toEqual(before);
      });

      it("keeps the human row until its source is edited", async () => {
        const opportunity = await translated();
        await patch(opportunity.id, { title: "Homework help" }, Lang.EN);

        await patch(opportunity.id, { title: opportunity.title }, Lang.DE);
        const [, kept] = await rowsOf(opportunity.id);
        expect(kept).toMatchObject({
          origin: TranslationOrigin.HUMAN,
          translation: "Homework help",
        });

        await patch(opportunity.id, { title: "Hausaufgabenhilfe" }, Lang.DE);
        const [, reset] = await rowsOf(opportunity.id);
        expect(reset).toMatchObject({
          origin: TranslationOrigin.MACHINE,
          status: TranslationStatus.PENDING,
          translation: null,
          sourceHash: sourceHashOf("Hausaufgabenhilfe"),
        });
        expect((await stored(opportunity.id)).title).toBe("Hausaufgabenhilfe");
      });
    });

    it.each([
      ["no ?language=", undefined],
      ["an unknown one", "fr"],
    ])("writes the source with %s", async (_, language) => {
      const opportunity = await saved({ originalLanguageId: ids[Lang.EN] });

      const res = await fastify.inject({
        method: "PATCH",
        url: `/opportunity/${opportunity.id}${language ? `?language=${language}` : ""}`,
        cookies: { [accessCookieName]: cookie },
        payload: { title: `Homework help ${suffix}` },
      });

      expect(res.statusCode).toBe(204);
      const stored = await fastify.db.opportunityRepository.findOneByOrFail({
        id: opportunity.id,
      });
      expect(stored.title).toBe(`Homework help ${suffix}`);
      const rows = await rowsOf(opportunity.id);
      expect(rows.map((row) => row.origin)).not.toContain(
        TranslationOrigin.HUMAN,
      );
    });

    describe("type change from accompanying in another language", () => {
      async function accompanyingOpportunity() {
        const accompanying = await fastify.db.accompanyingRepository.save(
          new Accompanying({ name: "Writes Test", address: "Writes Street 1" }),
        );
        accompanyings.push(accompanying.id);
        return saved({
          type: OpportunityType.ACCOMPANYING,
          accompanyingId: accompanying.id,
          info: null,
          infoConfidential: "Termin beim Amt",
        });
      }

      it("refuses a description, which has no original text yet", async () => {
        const opportunity = await accompanyingOpportunity();

        const res = await patch(
          opportunity.id,
          {
            opportunity_type: OpportunityType.REGULAR,
            description: "English text",
          },
          Lang.EN,
        );

        expect(res.statusCode).toBe(400);
        const stored = await fastify.db.opportunityRepository.findOneByOrFail({
          id: opportunity.id,
        });
        expect(stored.type).toBe(OpportunityType.ACCOMPANYING);
        expect(stored.info).toBeNull();
      });

      it("still moves the existing text over without a description", async () => {
        const opportunity = await accompanyingOpportunity();

        const res = await patch(
          opportunity.id,
          { opportunity_type: OpportunityType.REGULAR },
          Lang.EN,
        );

        expect(res.statusCode).toBe(204);
        const stored = await fastify.db.opportunityRepository.findOneByOrFail({
          id: opportunity.id,
        });
        expect(stored.info).toBe("Termin beim Amt");
      });
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

  it("documents ?language= only where a route reads it", async () => {
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
      ["/post/", "post"],
      ["/post/{id}", "patch"],
      ["/opportunity/{id}", "patch"],
    ]) {
      expect(languageParam(path, method), `${method} ${path}`).toBeDefined();
    }
    for (const [path, method] of [
      ["/opportunity/", "post"],
      ["/opportunity/legacy/", "post"],
    ]) {
      expect(languageParam(path, method), `${method} ${path}`).toBeUndefined();
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
