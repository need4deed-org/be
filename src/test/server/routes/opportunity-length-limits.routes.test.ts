import { FastifyInstance } from "fastify";
import {
  Lang,
  OPPORTUNITY_DESCRIPTION_MAX_LENGTH,
  OPPORTUNITY_TITLE_MAX_LENGTH,
  OPPORTUNITY_TRANSLATION_MAX_LENGTH,
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
import Address from "../../../data/entity/location/address.entity";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import Language from "../../../data/entity/profile/language.entity";
import User from "../../../data/entity/user.entity";
import { DealType } from "../../../data/types";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { queueOpportunityTranslation } from "../../../server/utils/data/translate-opportunities";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "Length-Limits-1!";

describe("opportunity title and description length limits", () => {
  let fastify: FastifyInstance;
  let cookie: string;
  let agent: Agent;
  let address: Address;
  let person: Person;
  let postcodeId: number;
  const suffix = randomNumericSuffix();
  const created: number[] = [];
  const deals: number[] = [];
  const ids = {} as Record<Lang, number>;
  const tooLongTitle = "t".repeat(OPPORTUNITY_TITLE_MAX_LENGTH + 1);
  const tooLongDescription = "d".repeat(OPPORTUNITY_DESCRIPTION_MAX_LENGTH + 1);

  async function saved(fields: Partial<Opportunity> = {}) {
    const deal = await fastify.db.dealRepository.save(
      new Deal({ type: DealType.OPPORTUNITY, postcodeId }),
    );
    deals.push(deal.id);
    const opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Length limits ${suffix}-${created.length}`,
        info: "Wir suchen Freiwillige",
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        originalLanguageId: ids[Lang.EN],
        agentId: agent.id,
        dealId: deal.id,
        ...fields,
      }),
    );
    created.push(opportunity.id);
    return opportunity;
  }

  const patch = (id: number, payload: Record<string, unknown>) =>
    fastify.inject({
      method: "PATCH",
      url: `/opportunity/${id}?language=en`,
      cookies: { [accessCookieName]: cookie },
      payload,
    });

  const create = (fields: Record<string, unknown>) =>
    fastify.inject({
      method: "POST",
      url: "/opportunity/?language=en",
      cookies: { [accessCookieName]: cookie },
      payload: {
        title: `Created ${suffix}`,
        agent_id: agent.id,
        opportunity_type: OpportunityLegacyType.VOLUNTEERING,
        vo_information: "Volunteering text",
        volunteers_number: 1,
        category: "",
        category_id: "",
        languageIds: [],
        activityIds: [],
        skillIds: [],
        ...fields,
      },
    });

  const createLegacy = (fields: Record<string, unknown>) =>
    fastify.inject({
      method: "POST",
      url: "/opportunity/legacy?language=en",
      payload: {
        title: `Created legacy ${suffix}`,
        opportunity_type: OpportunityLegacyType.VOLUNTEERING,
        vo_information: "Volunteering text",
        volunteers_number: 1,
        ...fields,
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
    postcodeId = (
      await fastify.db.postcodeRepository.findOneOrFail({
        where: {},
        order: { id: "ASC" },
      })
    ).id;
    address = await dataSource.manager.save(new Address({ postcodeId }));
    agent = await fastify.db.agentRepository.save(
      new Agent({
        title: `Length limits agent ${suffix}`,
        addressId: address.id,
      }),
    );
    person = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: "Length limits" }),
    );
    const email = `coordinator-length-limits-${suffix}@test.need4deed.org`;
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
    await fastify.db.userRepository.delete({ personId: person.id });
    await fastify.db.personRepository.delete({ id: person.id });
    await fastify.db.agentRepository.delete({ id: agent.id });
    await dataSource.manager.delete(Address, { id: address.id });
    await fastify.close();
  });

  describe("POST /opportunity", () => {
    it.each([
      ["title", { title: tooLongTitle }],
      ["vo_information", { vo_information: tooLongDescription }],
      ["accomp_information", { accomp_information: tooLongDescription }],
    ])("rejects a too long %s", async (_, fields) => {
      expect((await create(fields)).statusCode).toBe(400);
    });
  });

  describe("POST /opportunity/legacy", () => {
    it.each([
      ["title", { title: tooLongTitle }],
      ["vo_information", { vo_information: tooLongDescription }],
      ["accomp_information", { accomp_information: tooLongDescription }],
    ])("rejects a too long %s", async (_, fields) => {
      expect((await createLegacy(fields)).statusCode).toBe(400);
    });
  });

  describe("PATCH /opportunity/:id", () => {
    it("rejects a too long title", async () => {
      const opportunity = await saved();

      const res = await patch(opportunity.id, { title: tooLongTitle });

      expect(res.statusCode).toBe(400);
      expect(
        (
          await fastify.db.opportunityRepository.findOneByOrFail({
            id: opportunity.id,
          })
        ).title,
      ).toBe(opportunity.title);
    });

    it("rejects a changed too long description", async () => {
      const opportunity = await saved();

      const res = await patch(opportunity.id, {
        description: tooLongDescription,
      });

      expect(res.statusCode).toBe(400);
    });

    it("accepts a description at the limit", async () => {
      const opportunity = await saved();
      const description = "d".repeat(OPPORTUNITY_DESCRIPTION_MAX_LENGTH);

      const res = await patch(opportunity.id, { description });

      expect(res.statusCode).toBe(204);
      expect(
        (
          await fastify.db.opportunityRepository.findOneByOrFail({
            id: opportunity.id,
          })
        ).info,
      ).toBe(description);
    });

    it("keeps an unchanged legacy description over the limit editable", async () => {
      const legacy = "l".repeat(1322);
      const opportunity = await saved({ info: legacy });

      const res = await patch(opportunity.id, {
        description: legacy,
        numberVolunteers: 3,
      });

      expect(res.statusCode).toBe(204);
      expect(
        await fastify.db.opportunityRepository.findOneByOrFail({
          id: opportunity.id,
        }),
      ).toMatchObject({ info: legacy, numberVolunteers: 3 });
    });
  });

  describe("PATCH /opportunity/:id in a non-original language", () => {
    const infoMax = OPPORTUNITY_TRANSLATION_MAX_LENGTH.info;

    async function germanWithEnglishInfo(translation: string) {
      const opportunity = await saved({ originalLanguageId: ids[Lang.DE] });
      await queueOpportunityTranslation(dataSource.manager, opportunity);
      await dataSource.manager.update(
        FieldTranslation,
        {
          opportunityId: opportunity.id,
          fieldName: "info",
          languageId: ids[Lang.EN],
        },
        { status: TranslationStatus.DONE, translation },
      );
      return opportunity;
    }

    const englishInfo = (opportunityId: number) =>
      dataSource.manager.findOneByOrFail(FieldTranslation, {
        opportunityId,
        fieldName: "info",
        languageId: ids[Lang.EN],
      });

    it("stores a description over the source limit as a translation", async () => {
      const opportunity = await germanWithEnglishInfo("We need volunteers");
      const description = "e".repeat(OPPORTUNITY_DESCRIPTION_MAX_LENGTH + 100);

      const res = await patch(opportunity.id, { description });

      expect(res.statusCode).toBe(204);
      expect((await englishInfo(opportunity.id)).translation).toBe(description);
    });

    it("rejects a description over the translation limit", async () => {
      const opportunity = await germanWithEnglishInfo("We need volunteers");

      const res = await patch(opportunity.id, {
        description: "e".repeat(infoMax + 1),
      });

      expect(res.statusCode).toBe(400);
      expect((await englishInfo(opportunity.id)).translation).toBe(
        "We need volunteers",
      );
    });

    it("keeps an unchanged long translation editable", async () => {
      const translation = "e".repeat(1190);
      const opportunity = await germanWithEnglishInfo(translation);

      const res = await patch(opportunity.id, {
        description: translation,
        numberVolunteers: 4,
      });

      expect(res.statusCode).toBe(204);
      expect(
        (
          await fastify.db.opportunityRepository.findOneByOrFail({
            id: opportunity.id,
          })
        ).numberVolunteers,
      ).toBe(4);
    });
  });
});
