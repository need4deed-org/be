import { FastifyInstance } from "fastify";
import {
  Lang,
  OpportunityStatusType,
  OpportunityType,
  TranslationOrigin,
  TranslationStatus,
  UserRole,
} from "need4deed-sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accessCookieName } from "../../../config/constants";
import { dataSource } from "../../../data/data-source";
import FieldTranslation from "../../../data/entity/field_translation.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import Language from "../../../data/entity/profile/language.entity";
import Skill from "../../../data/entity/profile/skill.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { queueOpportunityTranslation } from "../../../server/utils/data/translate-opportunities";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "Translation-Review-1!";

describe("/translation coordinator review", () => {
  let fastify: FastifyInstance;
  const cookies = {} as Record<UserRole.COORDINATOR | UserRole.AGENT, string>;
  const persons: number[] = [];
  const created: number[] = [];
  const skills: number[] = [];
  const ids = {} as Record<Lang, number>;
  const suffix = randomNumericSuffix();

  async function login(role: UserRole.COORDINATOR | UserRole.AGENT) {
    const person = await fastify.db.personRepository.save(
      new Person({ firstName: "Test", lastName: `Review ${role}` }),
    );
    persons.push(person.id);
    const email = `${role}-translation-review-${suffix}@test.need4deed.org`;
    await fastify.db.userRepository.save(
      new User({
        email,
        password: await hashPassword(PASSWORD),
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
    cookies[role] = res.cookies.find((c) => c.name === accessCookieName)!.value;
  }

  async function queued(fields: Partial<Opportunity> = {}) {
    const opportunity = await fastify.db.opportunityRepository.save(
      new Opportunity({
        title: `Nachhilfe ${suffix}-${created.length}`,
        info: "Wir suchen Freiwillige",
        type: OpportunityType.REGULAR,
        status: OpportunityStatusType.NEW,
        originalLanguageId: ids[Lang.DE],
        ...fields,
      }),
    );
    created.push(opportunity.id);
    await queueOpportunityTranslation(dataSource.manager, opportunity);
    return opportunity;
  }

  async function skill() {
    const saved = await dataSource.manager.save(
      new Skill({ title: `Juggling ${suffix}-${skills.length}` }),
    );
    skills.push(saved.id);
    return saved;
  }

  const titleRow = (opportunityId: number) =>
    dataSource.manager.findOneByOrFail(FieldTranslation, {
      opportunityId,
      fieldName: "title",
    });

  async function translatedTitle(opportunity: Opportunity) {
    await dataSource.manager.update(
      FieldTranslation,
      { opportunityId: opportunity.id, fieldName: "title" },
      { status: TranslationStatus.DONE, translation: "Tutoring" },
    );
    return titleRow(opportunity.id);
  }

  const request = (
    method: "GET" | "POST" | "PUT" | "PATCH",
    url: string,
    role: UserRole.COORDINATOR | UserRole.AGENT | null = UserRole.COORDINATOR,
    payload?: Record<string, unknown>,
  ) =>
    fastify.inject({
      method,
      url: `/translation${url}`,
      ...(role && { cookies: { [accessCookieName]: cookies[role] } }),
      ...(payload && { payload }),
    });

  beforeAll(async () => {
    fastify = await createServer();
    await fastify.ready();
    for (const lang of Object.values(Lang)) {
      ids[lang] = (
        await dataSource.manager.findOneByOrFail(Language, { isoCode: lang })
      ).id;
    }
    await login(UserRole.COORDINATOR);
    await login(UserRole.AGENT);
  });

  afterAll(async () => {
    if (created.length) {
      await dataSource.manager.delete(Opportunity, created);
    }
    if (skills.length) {
      await dataSource.manager.delete(Skill, skills);
    }
    for (const personId of persons) {
      await fastify.db.userRepository.delete({ personId });
      await fastify.db.personRepository.delete({ id: personId });
    }
    await fastify.close();
  });

  describe("access", () => {
    it.each([
      ["GET", "/opportunity/1"],
      ["POST", "/"],
      ["PATCH", "/1"],
      ["POST", "/1/confirm"],
      ["PUT", "/opportunity/1/original-language"],
    ] as const)("%s %s is coordinator-only", async (method, url) => {
      const payload = {
        PUT: { language: Lang.EN },
        PATCH: { text: "Tutoring", original: "Nachhilfe" },
        POST: url === "/" && {
          entityType: "skill",
          entityId: 1,
          fieldName: "title",
          language: Lang.DE,
          text: "Jonglieren",
          original: "Juggling",
        },
      }[method as string];
      expect(
        (await request(method, url, UserRole.AGENT, payload)).statusCode,
      ).toBe(403);
      expect((await request(method, url, null, payload)).statusCode).toBe(401);
    });

    it("rejects an entity type that isn't translated", async () => {
      const res = await request("GET", "/comment/1");
      expect(res.statusCode).toBe(400);
    });

    it("404s on a missing entity", async () => {
      const res = await request("GET", "/opportunity/2147483647");
      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /:entityType/:entityId", () => {
    it("returns each field's original and its translations", async () => {
      const opportunity = await queued();
      const row = await translatedTitle(opportunity);
      await dataSource.manager.update(
        FieldTranslation,
        { opportunityId: opportunity.id, fieldName: "info" },
        {
          status: TranslationStatus.FAILED,
          lastErrorCode: "source_is_target",
        },
      );

      const res = await request("GET", `/opportunity/${opportunity.id}`);

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual([
        {
          fieldName: "title",
          original: opportunity.title,
          originalLanguage: Lang.DE,
          translations: {
            [Lang.EN]: {
              id: row.id,
              text: "Tutoring",
              origin: TranslationOrigin.MACHINE,
              status: TranslationStatus.DONE,
            },
          },
        },
        {
          fieldName: "info",
          original: "Wir suchen Freiwillige",
          originalLanguage: Lang.DE,
          translations: {
            [Lang.EN]: expect.objectContaining({
              text: null,
              status: TranslationStatus.FAILED,
              lastErrorCode: "source_is_target",
            }),
          },
        },
      ]);
    });

    it("returns a reference entity's translations in every language", async () => {
      const reference = await dataSource.manager
        .createQueryBuilder(FieldTranslation, "ft")
        .where("ft.skill_id IS NOT NULL")
        .orderBy("ft.id", "ASC")
        .getOneOrFail();

      const res = await request("GET", `/skill/${reference.skillId}`);

      expect(res.statusCode).toBe(200);
      const [title] = res.json().data;
      expect(title).not.toHaveProperty("originalLanguage");
      expect(Object.keys(title.translations).sort()).toEqual(
        Object.values(Lang).sort(),
      );
      expect(Object.values(title.translations)).toContainEqual(
        expect.objectContaining({
          id: reference.id,
          origin: TranslationOrigin.REFERENCE,
        }),
      );
    });

    it("skips fields with no original text", async () => {
      const opportunity = await queued({ info: null });

      const res = await request("GET", `/opportunity/${opportunity.id}`);

      expect(
        res.json().data.map((field: { fieldName: string }) => field.fieldName),
      ).toEqual(["title"]);
    });
  });

  describe("POST /", () => {
    const post = (payload: Record<string, unknown>) =>
      request("POST", "/", UserRole.COORDINATOR, payload);
    const opportunityTitle = (opportunity: Opportunity) => ({
      entityType: "opportunity",
      entityId: opportunity.id,
      fieldName: "title",
      language: Lang.EN,
      text: " Tutoring ",
      original: opportunity.title,
    });

    it("creates a human translation of an opportunity field", async () => {
      const opportunity = await queued();
      await dataSource.manager.delete(FieldTranslation, {
        opportunityId: opportunity.id,
        fieldName: "title",
      });

      const res = await post(opportunityTitle(opportunity));

      expect(res.statusCode).toBe(201);
      const row = await titleRow(opportunity.id);
      expect(res.json().data).toEqual({
        id: row.id,
        text: "Tutoring",
        origin: TranslationOrigin.HUMAN,
        status: TranslationStatus.DONE,
      });
      expect(row).toMatchObject({
        languageId: ids[Lang.EN],
        attempts: 0,
        lastErrorCode: null,
        model: null,
      });
      expect(row.sourceHash).toEqual(expect.any(String));
      await queueOpportunityTranslation(dataSource.manager, opportunity);
      expect(await titleRow(opportunity.id)).toMatchObject({
        origin: TranslationOrigin.HUMAN,
        translation: "Tutoring",
      });
    });

    it("creates a reference translation without checking the original", async () => {
      const { id } = await skill();

      const res = await post({
        entityType: "skill",
        entityId: id,
        fieldName: "title",
        language: Lang.DE,
        text: "Jonglieren",
        original: "",
      });

      expect(res.statusCode).toBe(201);
      expect(
        await dataSource.manager.findOneByOrFail(FieldTranslation, {
          skillId: id,
        }),
      ).toMatchObject({
        origin: TranslationOrigin.REFERENCE,
        status: TranslationStatus.DONE,
        translation: "Jonglieren",
        sourceHash: null,
      });
      const read = await request("GET", `/skill/${id}`);
      expect(read.json().data[0].translations[Lang.DE]).toMatchObject({
        text: "Jonglieren",
      });
    });

    it("rejects a field the entity type doesn't translate", async () => {
      const opportunity = await queued();

      const res = await post({
        ...opportunityTitle(opportunity),
        fieldName: "description",
      });

      expect(res.statusCode).toBe(400);
    });

    it("rejects the entity's original language", async () => {
      const opportunity = await queued();

      const res = await post({
        ...opportunityTitle(opportunity),
        language: Lang.DE,
      });

      expect(res.statusCode).toBe(400);
    });

    it.each([
      { text: "   " },
      { entityType: "comment" },
      { language: "fr" },
      { original: undefined },
    ])("rejects the body change %j", async (change) => {
      const opportunity = await queued();

      const res = await post({ ...opportunityTitle(opportunity), ...change });

      expect(res.statusCode).toBe(400);
    });

    it("404s on a missing entity", async () => {
      const res = await post({
        entityType: "skill",
        entityId: 2147483647,
        fieldName: "title",
        language: Lang.DE,
        text: "Jonglieren",
        original: "Juggling",
      });

      expect(res.statusCode).toBe(404);
    });

    it("409s when the translation already exists", async () => {
      const opportunity = await queued();
      const row = await translatedTitle(opportunity);

      const res = await post(opportunityTitle(opportunity));

      expect(res.statusCode).toBe(409);
      expect(await titleRow(opportunity.id)).toMatchObject({
        id: row.id,
        origin: TranslationOrigin.MACHINE,
      });
    });

    it("rejects a field with no original text", async () => {
      const opportunity = await queued({ info: null });

      const res = await post({
        ...opportunityTitle(opportunity),
        fieldName: "info",
        original: "",
      });

      expect(res.statusCode).toBe(400);
      expect(
        await dataSource.manager.countBy(FieldTranslation, {
          opportunityId: opportunity.id,
          fieldName: "info",
        }),
      ).toBe(0);
    });

    it("409s when the original has changed", async () => {
      const opportunity = await queued();
      await dataSource.manager.delete(FieldTranslation, {
        opportunityId: opportunity.id,
        fieldName: "title",
      });

      const res = await post({
        ...opportunityTitle(opportunity),
        original: "Alter Titel",
      });

      expect(res.statusCode).toBe(409);
      expect(
        await dataSource.manager.countBy(FieldTranslation, {
          opportunityId: opportunity.id,
          fieldName: "title",
        }),
      ).toBe(0);
    });
  });

  describe("PATCH /:id", () => {
    const patch = (id: number, text: string, original: string) =>
      request("PATCH", `/${id}`, UserRole.COORDINATOR, { text, original });

    it("turns a machine translation human and keeps it on re-enqueue", async () => {
      const opportunity = await queued();
      const row = await translatedTitle(opportunity);

      const res = await patch(row.id, " Homework help ", opportunity.title);

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual({
        id: row.id,
        text: "Homework help",
        origin: TranslationOrigin.HUMAN,
        status: TranslationStatus.DONE,
      });
      await queueOpportunityTranslation(dataSource.manager, opportunity);
      expect(await titleRow(opportunity.id)).toMatchObject({
        origin: TranslationOrigin.HUMAN,
        status: TranslationStatus.DONE,
        translation: "Homework help",
        sourceHash: row.sourceHash,
        model: null,
      });
    });

    it("confirms a machine translation by saving its current text", async () => {
      const opportunity = await queued();
      const row = await translatedTitle(opportunity);

      const res = await patch(row.id, "Tutoring", opportunity.title);

      expect(res.statusCode).toBe(200);
      expect(await titleRow(opportunity.id)).toMatchObject({
        origin: TranslationOrigin.HUMAN,
        translation: "Tutoring",
      });
    });

    it.each([TranslationStatus.PENDING, TranslationStatus.FAILED])(
      "fills in a %s row by hand",
      async (status) => {
        const opportunity = await queued();
        const row = await titleRow(opportunity.id);
        await dataSource.manager.update(
          FieldTranslation,
          { id: row.id },
          {
            status,
            attempts: 2,
            ...(status === TranslationStatus.FAILED && {
              translation: "Nachhilfe",
              lastErrorCode: "source_is_target",
              model: "m",
            }),
          },
        );

        const res = await patch(row.id, "Tutoring", opportunity.title);

        expect(res.statusCode).toBe(200);
        expect(await titleRow(opportunity.id)).toMatchObject({
          origin: TranslationOrigin.HUMAN,
          status: TranslationStatus.DONE,
          translation: "Tutoring",
          attempts: 0,
          lastErrorCode: null,
          model: null,
        });
      },
    );

    it("keeps a reference translation's origin and skips the original check", async () => {
      const reference = await dataSource.manager
        .createQueryBuilder(FieldTranslation, "ft")
        .where("ft.skill_id IS NOT NULL")
        .andWhere("ft.translation IS NOT NULL")
        .getOneOrFail();

      const res = await patch(
        reference.id,
        reference.translation!,
        "not the source",
      );

      expect(res.statusCode).toBe(200);
      expect(
        await dataSource.manager.findOneByOrFail(FieldTranslation, {
          id: reference.id,
        }),
      ).toMatchObject({
        origin: TranslationOrigin.REFERENCE,
        status: TranslationStatus.DONE,
        translation: reference.translation,
      });
    });

    it("refuses an edit of outdated original text and changes nothing", async () => {
      const opportunity = await queued();
      const row = await translatedTitle(opportunity);
      await dataSource.manager.update(
        Opportunity,
        { id: opportunity.id },
        { title: `Neu ${suffix}` },
      );

      const res = await patch(row.id, "Homework help", opportunity.title);

      expect(res.statusCode).toBe(409);
      expect(await titleRow(opportunity.id)).toMatchObject({
        origin: TranslationOrigin.MACHINE,
        translation: "Tutoring",
      });
    });

    it("404s on a missing translation", async () => {
      const res = await patch(2147483647, "Tutoring", "Nachhilfe");

      expect(res.statusCode).toBe(404);
    });

    it.each([
      { text: "   ", original: "Nachhilfe" },
      { text: "", original: "Nachhilfe" },
      { text: "Tutoring" },
    ])("rejects the body %j", async (payload) => {
      const opportunity = await queued();
      const row = await translatedTitle(opportunity);

      const res = await request(
        "PATCH",
        `/${row.id}`,
        UserRole.COORDINATOR,
        payload,
      );

      expect(res.statusCode).toBe(400);
      expect((await titleRow(opportunity.id)).translation).toBe("Tutoring");
    });
  });

  describe("POST /:id/confirm", () => {
    it("marks a machine translation human and keeps it on re-enqueue", async () => {
      const opportunity = await queued();
      const row = await translatedTitle(opportunity);

      const res = await request("POST", `/${row.id}/confirm`);
      expect(res.statusCode).toBe(204);
      await queueOpportunityTranslation(dataSource.manager, opportunity);

      expect(await titleRow(opportunity.id)).toMatchObject({
        origin: TranslationOrigin.HUMAN,
        status: TranslationStatus.DONE,
        translation: "Tutoring",
      });
    });

    it("refuses a translation of outdated original text", async () => {
      const opportunity = await queued();
      const row = await translatedTitle(opportunity);
      await dataSource.manager.update(
        Opportunity,
        { id: opportunity.id },
        { title: `Neu ${suffix}` },
      );

      const res = await request("POST", `/${row.id}/confirm`);

      expect(res.statusCode).toBe(409);
      expect((await titleRow(opportunity.id)).origin).toBe(
        TranslationOrigin.MACHINE,
      );
    });

    it("refuses a translation that isn't done", async () => {
      const opportunity = await queued();
      const row = await titleRow(opportunity.id);

      const res = await request("POST", `/${row.id}/confirm`);

      expect(res.statusCode).toBe(400);
      expect((await titleRow(opportunity.id)).origin).toBe(
        TranslationOrigin.MACHINE,
      );
    });

    it("404s on a reference translation", async () => {
      const reference = await dataSource.manager
        .createQueryBuilder(FieldTranslation, "ft")
        .where("ft.skill_id IS NOT NULL")
        .getOneOrFail();

      const res = await request("POST", `/${reference.id}/confirm`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe("PUT /:entityType/:entityId/original-language", () => {
    it("switches the original language and re-queues the other one", async () => {
      const opportunity = await queued();
      await translatedTitle(opportunity);

      const res = await request(
        "PUT",
        `/opportunity/${opportunity.id}/original-language`,
        UserRole.COORDINATOR,
        { language: Lang.EN },
      );

      expect(res.statusCode).toBe(204);
      const stored = await fastify.db.opportunityRepository.findOneByOrFail({
        id: opportunity.id,
      });
      expect(stored.originalLanguageId).toBe(ids[Lang.EN]);
      const rows = await dataSource.manager.find(FieldTranslation, {
        where: { opportunityId: opportunity.id },
      });
      expect(
        rows.map((row) => [row.fieldName, row.languageId, row.status]).sort(),
      ).toEqual([
        ["info", ids[Lang.DE], TranslationStatus.PENDING],
        ["title", ids[Lang.DE], TranslationStatus.PENDING],
      ]);
    });

    it("404s on a missing entity", async () => {
      const res = await request(
        "PUT",
        "/opportunity/2147483647/original-language",
        UserRole.COORDINATOR,
        { language: Lang.EN },
      );

      expect(res.statusCode).toBe(404);
    });

    it("rejects a language outside Lang", async () => {
      const opportunity = await queued();

      const res = await request(
        "PUT",
        `/opportunity/${opportunity.id}/original-language`,
        UserRole.COORDINATOR,
        { language: "fr" },
      );

      expect(res.statusCode).toBe(400);
    });
  });
});
