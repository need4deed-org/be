import { FastifyInstance } from "fastify";
import {
  EntityTableName,
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
import Deal from "../../../data/entity/deal.entity";
import FieldTranslation from "../../../data/entity/field_translation.entity";
import AgentService from "../../../data/entity/m2m/agent-service";
import DealSkill from "../../../data/entity/m2m/deal-skill";
import Agent from "../../../data/entity/opportunity/agent.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Person from "../../../data/entity/person.entity";
import AgentType from "../../../data/entity/profile/agent-type.entity";
import Language from "../../../data/entity/profile/language.entity";
import Service from "../../../data/entity/profile/service.entity";
import Skill from "../../../data/entity/profile/skill.entity";
import User from "../../../data/entity/user.entity";
import { hashPassword } from "../../../data/utils";
import { createServer } from "../../../server";
import { addAgentTypeServiceTranslations } from "../../../server/utils/data/add-agent-type-service-translations";
import { addTranslatedFields } from "../../../server/utils/data/for-routes";
import { queueOpportunityTranslation } from "../../../server/utils/data/translate-opportunities";
import { dtoAgentGet, dtoAgentGetList } from "../../../services/dto/dto-agent";
import { getOptionItems } from "../../../services/dto/utils";
import { getTranslationConfig } from "../../../services/translation/config";
import { FakeProvider } from "../../../services/translation/providers/fake";
import { sourceHashOf } from "../../../services/translation/queue";
import { resolve } from "../../../services/translation/resolve";
import { TranslationService } from "../../../services/translation/service";
import { runTranslationBatch } from "../../../services/translation/worker";
import { randomNumericSuffix } from "../../random";

const PASSWORD = "Translation-Review-1!";

describe("/translation coordinator review", () => {
  let fastify: FastifyInstance;
  const cookies = {} as Record<UserRole, string>;
  const persons: number[] = [];
  const created: number[] = [];
  const skills: number[] = [];
  const agentTypes: number[] = [];
  const services: number[] = [];
  const ids = {} as Record<Lang, number>;
  const suffix = randomNumericSuffix();

  async function login(role: UserRole) {
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
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    url: string,
    role: UserRole | null = UserRole.COORDINATOR,
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
    await login(UserRole.ADMIN);
    await login(UserRole.USER);
    await login(UserRole.VOLUNTEER);
  });

  afterAll(async () => {
    if (created.length) {
      await dataSource.manager.delete(Opportunity, created);
    }
    if (skills.length) {
      await dataSource.manager.delete(Skill, skills);
    }
    if (agentTypes.length) {
      await dataSource.manager.delete(AgentType, agentTypes);
    }
    if (services.length) {
      await dataSource.manager.delete(Service, services);
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
      ["DELETE", "/1"],
    ] as const)("%s %s is coordinator-only", async (method, url) => {
      const payload = {
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

    it.each([
      ["POST", "/1/confirm"],
      ["PUT", "/opportunity/1/original-language"],
    ] as const)("%s %s no longer exists", async (method, url) => {
      expect((await request(method, url)).statusCode).toBe(404);
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

  describe("DELETE /:id", () => {
    it.each([
      [TranslationOrigin.MACHINE, TranslationStatus.DONE],
      [TranslationOrigin.HUMAN, TranslationStatus.DONE],
      [TranslationOrigin.MACHINE, TranslationStatus.PENDING],
      [TranslationOrigin.MACHINE, TranslationStatus.FAILED],
    ])(
      "resets a %s/%s row against the current source without removing it",
      async (origin, status) => {
        const opportunity = await queued();
        const row = await translatedTitle(opportunity);
        const source = `Aktueller Titel ${suffix}-${opportunity.id}`;
        await dataSource.manager.update(
          Opportunity,
          { id: opportunity.id },
          { title: source },
        );
        await dataSource.manager.update(
          FieldTranslation,
          { id: row.id },
          {
            origin,
            status,
            attempts: 3,
            lastErrorCode: "source_is_target",
            model: "test-model",
          },
        );
        const other = await dataSource.manager.findOneByOrFail(
          FieldTranslation,
          {
            opportunityId: opportunity.id,
            fieldName: "info",
          },
        );

        const res = await request("DELETE", `/${row.id}`);

        expect(res.statusCode).toBe(204);
        expect(res.body).toBe("");
        expect(await titleRow(opportunity.id)).toMatchObject({
          id: row.id,
          origin: TranslationOrigin.MACHINE,
          status: TranslationStatus.PENDING,
          translation: null,
          attempts: 3,
          lastErrorCode: null,
          model: null,
          sourceHash: sourceHashOf(source),
        });
        expect(
          await dataSource.manager.findOneByOrFail(FieldTranslation, {
            id: other.id,
          }),
        ).toEqual(other);
        const read = await request("GET", `/opportunity/${opportunity.id}`);
        expect(read.json().data[0].translations[Lang.EN]).toMatchObject({
          id: row.id,
          text: null,
          status: TranslationStatus.PENDING,
        });
        const fresh = await dataSource.manager.findOneByOrFail(Opportunity, {
          id: opportunity.id,
        });
        await resolve(
          dataSource.manager,
          EntityTableName.OPPORTUNITY,
          [fresh],
          ["title"],
          Lang.EN,
        );
        expect(fresh.title).toBe(source);
      },
    );

    it("keeps the last row and allows an admin to reset it repeatedly", async () => {
      const opportunity = await queued({ info: null });
      const row = await translatedTitle(opportunity);
      for (let i = 0; i < 2; i++) {
        expect(
          (await request("DELETE", `/${row.id}`, UserRole.ADMIN)).statusCode,
        ).toBe(204);
        await queueOpportunityTranslation(dataSource.manager, opportunity);
        expect(
          await dataSource.manager.countBy(FieldTranslation, {
            opportunityId: opportunity.id,
          }),
        ).toBe(1);
        expect(await titleRow(opportunity.id)).toMatchObject({
          id: row.id,
          status: TranslationStatus.PENDING,
        });
      }
    });

    it("regenerates a reset row through the worker and serves the new translation", async () => {
      const opportunity = await queued({ info: null });
      const row = await translatedTitle(opportunity);
      expect((await request("DELETE", `/${row.id}`)).statusCode).toBe(204);
      const provider = new FakeProvider();
      const stats = await runTranslationBatch(
        dataSource.manager,
        new TranslationService(provider, async () => []),
        getTranslationConfig({}),
        { rowIds: [row.id], sleep: async () => {} },
      );
      expect(stats).toMatchObject({ picked: 1, done: 1, failed: 0 });
      expect(provider.requests).toHaveLength(1);
      expect(await titleRow(opportunity.id)).toMatchObject({
        id: row.id,
        origin: TranslationOrigin.MACHINE,
        status: TranslationStatus.DONE,
        translation: `[en] ${opportunity.title}`,
      });
      const fresh = await dataSource.manager.findOneByOrFail(Opportunity, {
        id: opportunity.id,
      });
      await resolve(
        dataSource.manager,
        EntityTableName.OPPORTUNITY,
        [fresh],
        ["title"],
        Lang.EN,
      );
      expect(fresh.title).toBe(`[en] ${opportunity.title}`);
    });

    it.each(["done", "failed", "unavailable"] as const)(
      "keeps an in-flight %s result when the same pending row is reset",
      async (outcome) => {
        const opportunity = await queued({ info: null });
        const row = await titleRow(opportunity.id);
        const provider = new FakeProvider(async ({ text }) => {
          expect((await request("DELETE", `/${row.id}`)).statusCode).toBe(204);
          expect(await titleRow(opportunity.id)).toEqual(row);
          if (outcome === "unavailable") {
            return { status: "error", kind: "unavailable" };
          }
          return {
            status: "ok",
            text: outcome === "failed" ? "" : `[en] ${text}`,
            model: "in-flight",
          };
        });
        const stats = await runTranslationBatch(
          dataSource.manager,
          new TranslationService(provider, async () => []),
          getTranslationConfig({}),
          { rowIds: [row.id], sleep: async () => {} },
        );
        expect(stats.stale).toBe(0);
        expect(stats[outcome === "unavailable" ? "retried" : outcome]).toBe(1);
      },
    );

    it("preserves backoff when a pending reset is repeated", async () => {
      const opportunity = await queued({ info: null });
      const row = await titleRow(opportunity.id);
      await dataSource.manager.update(
        FieldTranslation,
        { id: row.id },
        { attempts: 3 },
      );
      const before = await titleRow(opportunity.id);
      for (let i = 0; i < 2; i++) {
        expect((await request("DELETE", `/${row.id}`)).statusCode).toBe(204);
        expect(await titleRow(opportunity.id)).toEqual(before);
      }
      const provider = new FakeProvider();
      const stats = await runTranslationBatch(
        dataSource.manager,
        new TranslationService(provider, async () => []),
        getTranslationConfig({}),
        { rowIds: [row.id], sleep: async () => {} },
      );
      expect(stats.picked).toBe(0);
      expect(provider.requests).toHaveLength(0);
    });

    it("exhausts the remaining retry budget after a reset and refuses another reset", async () => {
      const opportunity = await queued({ info: null });
      const row = await translatedTitle(opportunity);
      const maxAttempts = getTranslationConfig({}).maxAttempts;
      await dataSource.manager.update(
        FieldTranslation,
        { id: row.id },
        { attempts: maxAttempts - 1 },
      );
      expect((await request("DELETE", `/${row.id}`)).statusCode).toBe(204);
      await dataSource.manager
        .createQueryBuilder()
        .update(FieldTranslation)
        .set({ updatedAt: () => "now() - interval '1 hour'" })
        .where("id = :id", { id: row.id })
        .execute();
      const provider = new FakeProvider(async () => ({
        status: "error",
        kind: "unavailable",
      }));
      const stats = await runTranslationBatch(
        dataSource.manager,
        new TranslationService(provider, async () => []),
        getTranslationConfig({}),
        { rowIds: [row.id], sleep: async () => {} },
      );
      expect(stats).toMatchObject({ picked: 1, failed: 1 });
      expect(provider.requests).toHaveLength(1);
      const failed = await titleRow(opportunity.id);
      expect(failed).toMatchObject({
        attempts: maxAttempts,
        status: TranslationStatus.FAILED,
      });
      expect((await request("DELETE", `/${row.id}`)).statusCode).toBe(409);
      expect(await titleRow(opportunity.id)).toEqual(failed);
    });

    it("refuses to reset an exhausted translation without changing it", async () => {
      const opportunity = await queued({ info: null });
      const row = await titleRow(opportunity.id);
      await dataSource.manager.update(
        FieldTranslation,
        { id: row.id },
        {
          attempts: getTranslationConfig({}).maxAttempts,
          status: TranslationStatus.FAILED,
          lastErrorCode: "provider_unavailable",
        },
      );
      const before = await titleRow(opportunity.id);
      for (let i = 0; i < 2; i++) {
        expect((await request("DELETE", `/${row.id}`)).statusCode).toBe(409);
        expect(await titleRow(opportunity.id)).toEqual(before);
      }
    });

    it.each(["original-language", "unregistered-field"])(
      "refuses a stale %s row without changing it",
      async (kind) => {
        const opportunity = await queued({ info: null });
        const row = await titleRow(opportunity.id);
        await dataSource.manager.update(
          FieldTranslation,
          { id: row.id },
          kind === "original-language"
            ? { languageId: ids[Lang.DE] }
            : { fieldName: "removedField" },
        );
        const before = await dataSource.manager.findOneByOrFail(
          FieldTranslation,
          { id: row.id },
        );
        expect((await request("DELETE", `/${row.id}`)).statusCode).toBe(400);
        expect(
          await dataSource.manager.findOneByOrFail(FieldTranslation, {
            id: row.id,
          }),
        ).toEqual(before);
      },
    );

    it("immediately removes a reset row whose source is empty", async () => {
      const opportunity = await queued({ info: null });
      const row = await titleRow(opportunity.id);
      await dataSource.manager.update(
        Opportunity,
        { id: opportunity.id },
        { title: "  " },
      );
      expect((await request("DELETE", `/${row.id}`)).statusCode).toBe(204);
      expect(
        await dataSource.manager.findOneBy(FieldTranslation, { id: row.id }),
      ).toBeNull();
      expect((await request("DELETE", `/${row.id}`)).statusCode).toBe(404);
    });

    it("keeps original type and service labels when reference values are null", async () => {
      const type = await dataSource.manager.save(
        new AgentType({ title: `Type ${suffix}` }),
      );
      agentTypes.push(type.id);
      const service = await dataSource.manager.save(
        new Service({ title: `Service ${suffix}` }),
      );
      services.push(service.id);
      await dataSource.manager.save(FieldTranslation, [
        { agentTypeId: type.id, languageId: ids[Lang.DE], translation: null },
        {
          agentTypeId: type.id,
          languageId: ids[Lang.EN],
          translation: "Accommodation",
        },
        { serviceId: service.id, languageId: ids[Lang.DE], translation: null },
        {
          serviceId: service.id,
          languageId: ids[Lang.EN],
          translation: "Advice",
        },
      ]);
      const agent = new Agent({
        agentTypeId: type.id,
        agentType: type,
        opportunity: [],
        agentService: [new AgentService({ serviceId: service.id, service })],
      });
      await addAgentTypeServiceTranslations([agent]);
      expect(dtoAgentGetList(agent).type.title).toEqual({
        de: type.title,
        en: "Accommodation",
      });
      expect(
        dtoAgentGet(Object.assign(agent, { comments: [] })).services,
      ).toEqual([
        { id: service.id, title: { de: service.title, en: "Advice" } },
      ]);
    });

    it("deletes a reference row and falls back to the original skill title", async () => {
      const original = await skill();
      const row = await dataSource.manager.save(FieldTranslation, {
        skillId: original.id,
        fieldName: "title",
        languageId: ids[Lang.DE],
        translation: "Jonglieren",
        origin: TranslationOrigin.REFERENCE,
        status: TranslationStatus.DONE,
      });
      const read = async () => {
        const fresh = await dataSource.manager.findOneByOrFail(Skill, {
          id: original.id,
        });
        const linked = new DealSkill({ skill: fresh });
        await addTranslatedFields(
          [{ id: 1, deal: new Deal({ dealSkill: [linked] }) }],
          Lang.DE,
        );
        return getOptionItems([linked], "skill")[0].title;
      };
      expect(await read()).toBe("Jonglieren");
      expect((await request("DELETE", `/${row.id}`)).statusCode).toBe(204);
      expect(
        await dataSource.manager.findOneBy(FieldTranslation, { id: row.id }),
      ).toBeNull();
      expect(await read()).toBe(original.title);
      expect(
        (await request("GET", `/skill/${original.id}`)).json().data[0]
          .translations,
      ).toEqual({});
      expect((await request("DELETE", `/${row.id}`)).statusCode).toBe(404);
    });

    it("falls back to the original agent type when another language remains", async () => {
      const type = await dataSource.manager.save(
        new AgentType({ title: `Unterkunft ${suffix}` }),
      );
      agentTypes.push(type.id);
      const rows = await dataSource.manager.save(
        FieldTranslation,
        [Lang.DE, Lang.EN].map((language) => ({
          agentTypeId: type.id,
          fieldName: "title",
          languageId: ids[language],
          translation: language === Lang.DE ? "Wohnheim" : "Accommodation",
          origin: TranslationOrigin.REFERENCE,
          status: TranslationStatus.DONE,
        })),
      );
      expect((await request("DELETE", `/${rows[0].id}`)).statusCode).toBe(204);
      const agent = new Agent({
        agentTypeId: type.id,
        agentType: type,
        opportunity: [],
      });
      await addAgentTypeServiceTranslations([agent]);
      expect(dtoAgentGetList(agent).type.title).toEqual({
        de: type.title,
        en: "Accommodation",
      });
    });

    it.each([UserRole.AGENT, UserRole.USER, UserRole.VOLUNTEER])(
      "rejects %s without changing the translation",
      async (role) => {
        const opportunity = await queued();
        const row = await translatedTitle(opportunity);
        expect((await request("DELETE", `/${row.id}`, role)).statusCode).toBe(
          403,
        );
        expect(await titleRow(opportunity.id)).toEqual(row);
      },
    );

    it("404s on a missing row", async () => {
      expect((await request("DELETE", "/2147483647")).statusCode).toBe(404);
    });

    it.each(["0", "-1", "not-an-id"])("rejects invalid id %s", async (id) => {
      expect((await request("DELETE", `/${id}`)).statusCode).toBe(400);
    });
  });
});
