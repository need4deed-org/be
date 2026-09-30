import { FastifyInstance } from "fastify";
import {
  EntityTableName,
  OpportunityType,
  TranslationStatus,
} from "need4deed-sdk";
import cron from "node-cron";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dataSource } from "../../../data/data-source";
import FieldTranslation from "../../../data/entity/field_translation.entity";
import Opportunity from "../../../data/entity/opportunity/opportunity.entity";
import Language from "../../../data/entity/profile/language.entity";
import logger from "../../../logger";
import { createServer } from "../../../server";
import * as service from "../../../services/translation/service";
import { randomNumericSuffix } from "../../random";

const TRANSLATION_SCHEDULE = "* * * * *";

// Every test starts and closes a full server (createServer), which
// re-initialises the DB connection: slower than the 5 s default, as in
// swagger.test.ts.
vi.setConfig({ testTimeout: 30_000 });

describe("translation plugin", () => {
  let fastify: FastifyInstance | undefined;
  const created: number[] = [];

  async function start(env: Record<string, string> = {}) {
    Object.assign(process.env, env);
    fastify = await createServer();
    await fastify.ready();
    return fastify;
  }

  const translationSchedules = (spy: ReturnType<typeof vi.spyOn>) =>
    spy.mock.calls.filter(
      ([expression]) => expression === TRANSLATION_SCHEDULE,
    );

  afterEach(async () => {
    delete process.env.TRANSLATION_ENABLED;
    delete process.env.CRON_SCHEDULE_TRANSLATION;
    vi.restoreAllMocks();
    if (created.length) {
      await dataSource.manager.delete(Opportunity, created.splice(0));
    }
    await fastify?.close();
    fastify = undefined;
  });

  it("offers queueing and resolving, but no worker, while disabled", async () => {
    const schedule = vi.spyOn(cron, "schedule");
    const server = await start();

    for (const fn of [
      "enqueue",
      "setHuman",
      "setOriginalLanguage",
      "resolve",
    ]) {
      expect(
        typeof server.translation[fn as keyof typeof server.translation],
      ).toBe("function");
    }
    expect(await server.translation.runBatch()).toBeUndefined();
    expect(translationSchedules(schedule)).toHaveLength(0);
  });

  it("schedules the worker when enabled and runs it under the lock", async () => {
    const schedule = vi.spyOn(cron, "schedule");
    const server = await start({ TRANSLATION_ENABLED: "true" });
    expect(translationSchedules(schedule)).toHaveLength(1);

    const de = await dataSource.manager.findOneByOrFail(Language, {
      isoCode: "de",
    });
    const opportunity = await dataSource.manager.save(
      new Opportunity({
        title: `Kinderbetreuung ${randomNumericSuffix()}`,
        type: OpportunityType.REGULAR,
        originalLanguageId: de.id,
      }),
    );
    created.push(opportunity.id);
    await server.translation.enqueue(
      dataSource.manager,
      EntityTableName.OPPORTUNITY,
      opportunity,
      { title: opportunity.title },
    );
    const row = await dataSource.manager.findOneByOrFail(FieldTranslation, {
      opportunityId: opportunity.id,
    });

    // Tests get the fake provider: no network.
    const stats = await server.translation.runBatch({ rowIds: [row.id] });

    expect(stats).toMatchObject({ picked: 1, done: 1 });
    expect(
      await dataSource.manager.findOneByOrFail(FieldTranslation, {
        id: row.id,
      }),
    ).toMatchObject({
      status: TranslationStatus.DONE,
      translation: `[en] ${opportunity.title}`,
    });
  });

  it("stops the scheduled worker when the server closes", async () => {
    const schedule = vi.spyOn(cron, "schedule");
    const server = await start({ TRANSLATION_ENABLED: "true" });
    const index = schedule.mock.calls.findIndex(
      ([expression]) => expression === TRANSLATION_SCHEDULE,
    );
    const stop = vi.spyOn(schedule.mock.results[index].value, "stop");

    await server.close();
    fastify = undefined;

    expect(stop).toHaveBeenCalled();
  });

  it("keeps the server running on an invalid schedule, without the worker", async () => {
    const schedule = vi.spyOn(cron, "schedule");
    const error = vi.spyOn(logger, "error");

    const server = await start({
      TRANSLATION_ENABLED: "true",
      CRON_SCHEDULE_TRANSLATION: "every minute",
    });

    expect(server.translation).toBeDefined();
    expect(schedule.mock.calls.map(([expression]) => expression)).not.toContain(
      "every minute",
    );
    expect(JSON.stringify(error.mock.calls)).toContain(
      "CRON_SCHEDULE_TRANSLATION",
    );
  });

  it("does a dry run without a provider: nothing sent, rows stay pending", async () => {
    vi.spyOn(service, "createTranslationProvider").mockReturnValue(undefined);
    const warn = vi.spyOn(logger, "warn");
    const server = await start({ TRANSLATION_ENABLED: "true" });

    const de = await dataSource.manager.findOneByOrFail(Language, {
      isoCode: "de",
    });
    const opportunity = await dataSource.manager.save(
      new Opportunity({
        title: `Kinderbetreuung ${randomNumericSuffix()}`,
        type: OpportunityType.REGULAR,
        originalLanguageId: de.id,
      }),
    );
    created.push(opportunity.id);
    await server.translation.enqueue(
      dataSource.manager,
      EntityTableName.OPPORTUNITY,
      opportunity,
      { title: opportunity.title },
    );
    const row = await dataSource.manager.findOneByOrFail(FieldTranslation, {
      opportunityId: opportunity.id,
    });

    expect(
      await server.translation.runBatch({ rowIds: [row.id] }),
    ).toBeUndefined();
    expect(
      await dataSource.manager.findOneByOrFail(FieldTranslation, {
        id: row.id,
      }),
    ).toMatchObject({ status: TranslationStatus.PENDING, translation: null });
    expect(JSON.stringify(warn.mock.calls)).toContain("dry run");
  });
});
